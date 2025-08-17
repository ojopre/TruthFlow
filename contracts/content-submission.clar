;; content-submission.clar
;; Clarity v2 (latest syntax as of 2025, using standard Clarity 2 features)
;; Content Submission Contract for TruthFlow
;; Allows users to submit news content hashes with metadata, stores immutably on-chain,
;; manages content status, flagging, and admin controls for pausing and ownership.
;; Emits events for submissions and flags for integration with other contracts.
;; Designed to be robust with input validation, status tracking, and security checks.

(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-PAUSED u101)
(define-constant ERR-INVALID-HASH u102) ;; Hash must be non-empty string
(define-constant ERR-INVALID-METADATA u103) ;; Invalid or missing metadata fields
(define-constant ERR-CONTENT-NOT-FOUND u104)
(define-constant ERR-ALREADY-FLAGGED u105)
(define-constant ERR-INVALID-STATUS u106)
(define-constant ERR-ZERO-ADDRESS u107)
(define-constant ERR-STRING-TOO-LONG u108) ;; Strings exceed max length
(define-constant ERR-INVALID-CATEGORY u109) ;; Category not in allowed list

(define-constant MAX-HASH-LENGTH u64) ;; e.g., IPFS hash length limit
(define-constant MAX-SOURCE-LENGTH u128)
(define-constant MAX-CATEGORY-LENGTH u32)

;; Allowed categories (simulated enum via constants)
(define-constant CATEGORY-POLITICS "politics")
(define-constant CATEGORY-ECONOMY "economy")
(define-constant CATEGORY-TECHNOLOGY "technology")
(define-constant CATEGORY-HEALTH "health")
(define-constant CATEGORY-ENVIRONMENT "environment")
(define-constant CATEGORY-SPORTS "sports")
(define-constant CATEGORY-ENTERTAINMENT "entertainment")
(define-constant CATEGORY-OTHER "other")

;; Admin and state
(define-data-var admin principal tx-sender)
(define-data-var paused bool false)
(define-data-var next-content-id uint u1) ;; Starts from 1

;; Content storage: id -> content details
(define-map contents uint
  {
    hash: (string-ascii 64), ;; Content hash (e.g., IPFS CID)
    submitter: principal,
    source: (string-ascii 128),
    timestamp: uint, ;; Submission block height or external timestamp
    category: (string-ascii 32),
    status: (string-ascii 16), ;; "pending", "verified", "rejected", "flagged"
    submit-time: uint, ;; Block height of submission
    flag-count: uint ;; Number of flags
  }
)

;; Map for flagged contents: content-id -> list of flaggers (to prevent duplicate flags)
(define-map flags uint (list 100 principal)) ;; Up to 100 flaggers per content

;; Private: Check if caller is admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Private: Ensure contract is not paused
(define-private (ensure-not-paused)
  (asserts! (not (var-get paused)) (err ERR-PAUSED))
)

;; Private: Validate string length
(define-private (validate-string-length (s (string-ascii 256)) (max-len uint))
  (asserts! (<= (len s) max-len) (err ERR-STRING-TOO-LONG))
)

;; Private: Validate category
(define-private (is-valid-category (cat (string-ascii 32)))
  (or
    (is-eq cat CATEGORY-POLITICS)
    (is-eq cat CATEGORY-ECONOMY)
    (is-eq cat CATEGORY-TECHNOLOGY)
    (is-eq cat CATEGORY-HEALTH)
    (is-eq cat CATEGORY-ENVIRONMENT)
    (is-eq cat CATEGORY-SPORTS)
    (is-eq cat CATEGORY-ENTERTAINMENT)
    (is-eq cat CATEGORY-OTHER)
  )
)

;; Private: Validate metadata
(define-private (validate-metadata (metadata {source: (string-ascii 128), timestamp: uint, category: (string-ascii 32)}))
  (begin
    (asserts! (> (len (get source metadata)) u0) (err ERR-INVALID-METADATA))
    (try! (validate-string-length (get source metadata) MAX-SOURCE-LENGTH))
    (asserts! (> (get timestamp metadata) u0) (err ERR-INVALID-METADATA))
    (asserts! (> (len (get category metadata)) u0) (err ERR-INVALID-METADATA))
    (try! (validate-string-length (get category metadata) MAX-CATEGORY-LENGTH))
    (asserts! (is-valid-category (get category metadata)) (err ERR-INVALID-CATEGORY))
    (ok true)
  )
)

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-admin 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set admin new-admin)
    (ok true)
  )
)

;; Pause/unpause contract
(define-public (set-paused (pause bool))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (var-set paused pause)
    (ok pause)
  )
)

;; Submit new content
(define-public (submit-content (content-hash (string-ascii 64)) (metadata {source: (string-ascii 128), timestamp: uint, category: (string-ascii 32)}))
  (begin
    (ensure-not-paused)
    (try! (validate-string-length content-hash MAX-HASH-LENGTH))
    (asserts! (> (len content-hash) u0) (err ERR-INVALID-HASH))
    (try! (validate-metadata metadata))
    (let ((content-id (var-get next-content-id)))
      (map-set contents content-id
        {
          hash: content-hash,
          submitter: tx-sender,
          source: (get source metadata),
          timestamp: (get timestamp metadata),
          category: (get category metadata),
          status: "pending",
          submit-time: block-height,
          flag-count: u0
        }
      )
      (var-set next-content-id (+ content-id u1))
      ;; Emit event for submission
      (print { event: "content-submitted", content-id: content-id, submitter: tx-sender, hash: content-hash })
      (ok content-id)
    )
  )
)

;; Flag content as suspicious (can be called by anyone, but limited to once per user)
(define-public (flag-content (content-id uint))
  (begin
    (ensure-not-paused)
    (match (map-get? contents content-id)
      content
        (begin
          (asserts! (not (is-eq (get status content) "rejected")) (err ERR-INVALID-STATUS))
          (let ((current-flags (default-to (list) (map-get? flags content-id))))
            (asserts! (is-none (index-of? current-flags tx-sender)) (err ERR-ALREADY-FLAGGED))
            (map-set flags content-id (unwrap! (as-max-len? (append current-flags tx-sender) u100) (err u500))) ;; Internal error if list overflows
            (map-set contents content-id (merge content { flag-count: (+ (get flag-count content) u1) }))
            ;; If flags reach threshold, auto-flag status (e.g., 5 flags)
            (if (>= (+ (get flag-count content) u1) u5)
              (map-set contents content-id (merge content { status: "flagged" }))
              false
            )
            ;; Emit event
            (print { event: "content-flagged", content-id: content-id, flagger: tx-sender })
            (ok true)
          )
        )
      (err ERR-CONTENT-NOT-FOUND)
    )
  )
)

;; Admin: Update content status (e.g., after governance vote, but callable here for flexibility)
(define-public (update-status (content-id uint) (new-status (string-ascii 16)))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (match (map-get? contents content-id)
      content
        (begin
          (asserts! (or (is-eq new-status "verified") (is-eq new-status "rejected") (is-eq new-status "pending") (is-eq new-status "flagged")) (err ERR-INVALID-STATUS))
          (map-set contents content-id (merge content { status: new-status }))
          ;; Emit event
          (print { event: "status-updated", content-id: content-id, new-status: new-status })
          (ok true)
        )
      (err ERR-CONTENT-NOT-FOUND)
    )
  )
)

;; Read-only: Get content details
(define-read-only (get-content (content-id uint))
  (ok (map-get? contents content-id))
)

;; Read-only: Get content status
(define-read-only (get-content-status (content-id uint))
  (match (map-get? contents content-id)
    content (ok (get status content))
    (err ERR-CONTENT-NOT-FOUND)
  )
)

;; Read-only: Get flag count
(define-read-only (get-flag-count (content-id uint))
  (match (map-get? contents content-id)
    content (ok (get flag-count content))
    (err ERR-CONTENT-NOT-FOUND)
  )
)

;; Read-only: Get next content ID
(define-read-only (get-next-id)
  (ok (var-get next-content-id))
)

;; Read-only: Get admin
(define-read-only (get-admin)
  (ok (var-get admin))
)

;; Read-only: Is paused
(define-read-only (is-paused)
  (ok (var-get paused))
)

;; Read-only: Check if user has flagged a content
(define-read-only (has-flagged (content-id uint) (user principal))
  (match (map-get? flags content-id)
    flag-list (ok (is-some (index-of? flag-list user)))
    (ok false)
  )
)