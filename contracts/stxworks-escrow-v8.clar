
(define-trait sip010-ft-trait
  ((transfer (uint principal principal (optional (buff 34))) (response bool uint))
   (get-balance (principal) (response uint uint))))

(define-constant DAO-INSTANT u1000)
(define-constant FEE-CLIENT u700)
(define-constant FEE-FREELANCER u300)
(define-constant MAX-FEE-TOTAL u1500)
(define-constant REFUND-TIMEOUT u144)
(define-constant FORCE-RELEASE-TIMEOUT u144)
(define-constant ABANDON-TIMEOUT u1008)
(define-constant MAX-MILESTONES u4)

(define-constant TOKEN-STX   u0)
(define-constant TOKEN-SBTC  u1)
(define-constant TOKEN-USDCX u2)

(define-constant ERR-NOT-DAO          (err u200))
(define-constant ERR-NOT-CLIENT       (err u201))
(define-constant ERR-NOT-FREELANCER   (err u202))
(define-constant ERR-INVALID-MS       (err u203))
(define-constant ERR-CONTRACT-PAUSED  (err u119))
(define-constant ERR-FEE-TOO-HIGH     (err u120))
(define-constant ERR-DISPUTE-ACTIVE   (err u131))
(define-constant ERR-NOT-COMPLETE     (err u105))
(define-constant ERR-ALREADY-RELEASED (err u106))
(define-constant ERR-INVALID-AMOUNT   (err u108))
(define-constant ERR-REFUND-NOT-ALLOWED (err u111))
(define-constant ERR-ALREADY-REFUNDED (err u112))
(define-constant ERR-PROJECT-NOT-FOUND (err u102))

(define-data-var project-counter uint u0)
(define-data-var dao-governor principal tx-sender)
(define-data-var paused bool false)
(define-data-var treasury principal tx-sender)

(define-map projects uint
  { client: principal,
    freelancer: principal,
    gross: uint,
    net: uint,
    dao-cut: uint,
    fee-client: uint,
    fee-freelancer: uint,
    ms-count: uint,
    token-type: uint,
    refunded: bool,
    created-at: uint })

(define-map milestones {project: uint, ms: uint}
  { amount: uint, complete: bool, released: bool, completed-at: uint })

(define-map project-last-activity uint uint)

(define-map disputes {project: uint, ms: uint}
  { filed-by: principal, status: uint, resolved-in-favor-of: (optional principal), filed-at: uint, resolved-at: uint })

(define-private (assert-dao)        (asserts! (is-eq tx-sender (var-get dao-governor)) ERR-NOT-DAO))
(define-private (assert-not-paused) (asserts! (not (var-get paused)) ERR-CONTRACT-PAUSED))

(define-public (set-dao-wallet (new principal))
  (begin (assert-dao) (var-set dao-wallet new) (ok true)))

(define-public (set-dao-governor (new principal))
  (begin (assert-dao) (var-set dao-governor new) (ok true)))

(define-public (set-paused (p bool))
  (begin (assert-dao) (var-set paused p) (ok true)))

(define-public (create-project-stx (freelancer principal) (m1 uint) (m2 uint) (m3 uint) (m4 uint))
  (let ((id (+ (var-get project-counter) u1))
        (gross (+ m1 (+ m2 (+ m3 m4))))
        (dao-cut (/ (* gross DAO-INSTANT) u10000))
        (client-fee (/ (* gross FEE-CLIENT) u10000))
        (freelancer-fee (/ (* gross FEE-FREELANCER) u10000))
        (net (- gross (+ dao-cut (+ client-fee freelancer-fee))))
        (ms-count (+ (if (> m1 u0) u1 u0)
                     (+ (if (> m2 u0) u1 u0)
                        (+ (if (> m3 u0) u1 u0)
                           (if (> m4 u0) u1 u0))))))
    (try! (assert-not-paused))
    (asserts! (and (>= ms-count u2) (<= ms-count MAX-MILESTONES)) ERR-INVALID-MS)
    (try! (stx-transfer? gross tx-sender (as-contract tx-sender)))
    (try! (as-contract (stx-transfer? dao-cut (as-contract tx-sender) (var-get dao-wallet))))
    (try! (as-contract (stx-transfer? client-fee (as-contract tx-sender) (var-get dao-wallet))))
    (var-set project-counter id)
    (map-set projects id
      {client: tx-sender, freelancer: freelancer, gross: gross, net: net,
       dao-cut: dao-cut, fee-client: client-fee, fee-freelancer: freelancer-fee,
       ms-count: ms-count, token-type: TOKEN-STX, refunded: false, created-at: burn-block-height})
    (if (> m1 u0) (map-set milestones {project: id, ms: u1} {amount: m1, complete: false, released: false, completed-at: u0}) true)
    (if (> m2 u0) (map-set milestones {project: id, ms: u2} {amount: m2, complete: false, released: false, completed-at: u0}) true)
    (if (> m3 u0) (map-set milestones {project: id, ms: u3} {amount: m3, complete: false, released: false, completed-at: u0}) true)
    (if (> m4 u0) (map-set milestones {project: id, ms: u4} {amount: m4, complete: false, released: false, completed-at: u0}) true)
    (print {event: "STXWORX-Job", id: id, memo: (concat "STXWORX Job #" (to-string id)), dao-cut: dao-cut})
    (ok id)))

(define-public (create-project-sbtc
    (freelancer principal)
    (m1 uint) (m2 uint) (m3 uint) (m4 uint)
    (sbtc-token <sip010-ft-trait>))
  (let ((id (+ (var-get project-counter) u1))
        (gross (+ m1 (+ m2 (+ m3 m4))))
        (dao-cut (/ (* gross DAO-INSTANT) u10000))
        (client-fee (/ (* gross FEE-CLIENT) u10000))
        (freelancer-fee (/ (* gross FEE-FREELANCER) u10000))
        (net (- gross (+ dao-cut (+ client-fee freelancer-fee))))
        (ms-count (+ (if (> m1 u0) u1 u0)
                     (+ (if (> m2 u0) u1 u0)
                        (+ (if (> m3 u0) u1 u0)
                           (if (> m4 u0) u1 u0))))))
        (contract-addr (as-contract tx-sender))
        (balance-before (unwrap! (contract-call? sbtc-token get-balance contract-addr) (err u118))))
    (try! (assert-not-paused))
    (asserts! (and (>= ms-count u2) (<= ms-count MAX-MILESTONES)) ERR-INVALID-MS)
    (asserts! (>= balance-before gross) (err u118))
    (try! (contract-call? sbtc-token transfer dao-cut contract-addr (var-get dao-wallet) none))
    (try! (contract-call? sbtc-token transfer client-fee contract-addr (var-get dao-wallet) none))
    (var-set project-counter id)
    (map-set projects id
      {client: tx-sender, freelancer: freelancer, gross: gross, net: net,
       dao-cut: dao-cut, fee-client: client-fee, fee-freelancer: freelancer-fee,
       ms-count: ms-count, token-type: TOKEN-SBTC, refunded: false, created-at: burn-block-height})
    (if (> m1 u0) (map-set milestones {project: id, ms: u1} {amount: m1, complete: false, released: false, completed-at: u0}) true)
    (print {event: "STXWORX-Job", id: id, memo: (concat "STXWORX Job #" (to-string id)), token: "sBTC", dao-cut: dao-cut})
    (ok id)))

(define-public (create-project-usdcx
    (freelancer principal)
    (m1 uint) (m2 uint) (m3 uint) (m4 uint)
    (usdcx-token <sip010-ft-trait>))
  (let ((id (+ (var-get project-counter) u1))
        (gross (+ m1 (+ m2 (+ m3 m4))))
        (dao-cut (/ (* gross DAO-INSTANT) u10000))
        (client-fee (/ (* gross FEE-CLIENT) u10000))
        (freelancer-fee (/ (* gross FEE-FREELANCER) u10000))
        (net (- gross (+ dao-cut (+ client-fee freelancer-fee))))
        (ms-count (+ (if (> m1 u0) u1 u0)
                     (+ (if (> m2 u0) u1 u0)
                        (+ (if (> m3 u0) u1 u0)
                           (if (> m4 u0) u1 u0))))))
        (contract-addr (as-contract tx-sender))
        (balance-before (unwrap! (contract-call? usdcx-token get-balance contract-addr) (err u118))))
    (try! (assert-not-paused))
    (asserts! (and (>= ms-count u2) (<= ms-count MAX-MILESTONES)) ERR-INVALID-MS)
    (asserts! (>= balance-before gross) (err u118))
    (try! (contract-call? usdcx-token transfer dao-cut contract-addr (var-get dao-wallet) none))
    (try! (contract-call? usdcx-token transfer client-fee contract-addr (var-get dao-wallet) none))
    (var-set project-counter id)
    (map-set projects id
      {client: tx-sender, freelancer: freelancer, gross: gross, net: net,
       dao-cut: dao-cut, fee-client: client-fee, fee-freelancer: freelancer-fee,
       ms-count: ms-count, token-type: TOKEN-USDCX, refunded: false, created-at: burn-block-height})
    (if (> m1 u0) (map-set milestones {project: id, ms: u1} {amount: m1, complete: false, released: false, completed-at: u0}) true)
    (print {event: "STXWORX-Job", id: id, memo: (concat "STXWORX Job #" (to-string id)), token: "USDCx", dao-cut: dao-cut})
    (ok id))))

(define-read-only (get-dao-wallet) (var-get dao-wallet))
(define-read-only (get-project (id uint)) (map-get? projects id))
(define-read-only (get-milestone (project-id uint) (ms uint))
  (map-get? milestones {project: project-id, ms: ms}))
(define-read-only (get-project-count) (var-get project-counter))
(define-read-only (is-paused) (var-get paused))