;; Maze Game Bounty Smart Contract
;; Core game logic handled on frontend, contract manages state and rewards

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-not-authorized (err u100))
(define-constant err-game-not-found (err u101))
(define-constant err-already-completed (err u102))
(define-constant err-insufficient-bounty (err u103))
(define-constant err-max-winners-reached (err u104))
(define-constant err-invalid-round (err u105))
(define-constant err-game-not-active (err u106))
(define-constant err-already-winner (err u107))

(define-constant max-winners u5)

;; Data Variables
(define-data-var game-counter uint u0)
(define-data-var platform-fee-percentage uint u5) ;; 5% platform fee

;; Data Maps
;; Game structure
(define-map games
  uint ;; game-id
  {
    creator: principal,
    total-rounds: uint,
    bounty: uint,
    created-at: uint,
    is-active: bool,
    winners-count: uint,
    bounty-distributed: bool
  }
)

;; Player progress tracking
(define-map player-progress
  { game-id: uint, player: principal }
  {
    current-round: uint,
    completed: bool,
    completion-time: uint,
    completion-block: uint
  }
)

;; Winners list for each game
(define-map game-winners
  { game-id: uint, position: uint } ;; position 1-5
  {
    player: principal,
    completion-time: uint,
    reward-amount: uint,
    claimed: bool
  }
)

;; Read-only functions
(define-read-only (get-game-counter)
  (var-get game-counter)
)

(define-read-only (get-game (game-id uint))
  (map-get? games game-id)
)

(define-read-only (get-player-progress (game-id uint) (player principal))
  (map-get? player-progress { game-id: game-id, player: player })
)

(define-read-only (get-winner (game-id uint) (position uint))
  (map-get? game-winners { game-id: game-id, position: position })
)

(define-read-only (get-platform-fee-percentage)
  (var-get platform-fee-percentage)
)

(define-read-only (is-player-winner (game-id uint) (player principal))
  (let
    (
      (position u1)
    )
    (or
      (is-winner-at-position game-id player u1)
      (is-winner-at-position game-id player u2)
      (is-winner-at-position game-id player u3)
      (is-winner-at-position game-id player u4)
      (is-winner-at-position game-id player u5)
    )
  )
)

(define-private (is-winner-at-position (game-id uint) (player principal) (position uint))
  (match (map-get? game-winners { game-id: game-id, position: position })
    winner (is-eq (get player winner) player)
    false
  )
)

;; Public functions

;; Create a new maze game with bounty
(define-public (create-game (total-rounds uint) (bounty uint))
  (let
    (
      (new-game-id (+ (var-get game-counter) u1))
    )
    (asserts! (> total-rounds u0) err-invalid-round)
    
    ;; Transfer bounty to contract if bounty > 0
    (if (> bounty u0)
      (try! (stx-transfer? bounty tx-sender (as-contract tx-sender)))
      true
    )
    
    ;; Store game data
    (map-set games new-game-id
      {
        creator: tx-sender,
        total-rounds: total-rounds,
        bounty: bounty,
        created-at: stacks-block-height,
        is-active: true,
        winners-count: u0,
        bounty-distributed: false
      }
    )
    
    ;; Increment counter
    (var-set game-counter new-game-id)
    
    (ok new-game-id)
  )
)

;; Update player progress (called from frontend after validating game logic)
(define-public (update-player-progress (game-id uint) (current-round uint) (completion-time uint))
  (let
    (
      (game (unwrap! (map-get? games game-id) err-game-not-found))
      (existing-progress (map-get? player-progress { game-id: game-id, player: tx-sender }))
    )
    ;; Verify game is active
    (asserts! (get is-active game) err-game-not-active)
    
    ;; Verify round is valid
    (asserts! (<= current-round (get total-rounds game)) err-invalid-round)
    
    ;; Check if player already completed
    (match existing-progress
      progress (asserts! (not (get completed progress)) err-already-completed)
      true
    )
    
    ;; Update progress
    (map-set player-progress
      { game-id: game-id, player: tx-sender }
      {
        current-round: current-round,
        completed: (is-eq current-round (get total-rounds game)),
        completion-time: completion-time,
        completion-block: stacks-block-height
      }
    )
    
    ;; If completed all rounds, try to add to winners
    (if (is-eq current-round (get total-rounds game))
      (try-add-winner game-id completion-time)
      (ok true)
    )
  )
)

;; Try to add player as winner (top 5 fastest)
(define-private (try-add-winner (game-id uint) (completion-time uint))
  (let
    (
      (game (unwrap! (map-get? games game-id) err-game-not-found))
      (current-winners (get winners-count game))
    )
    ;; Check if already a winner
    (asserts! (not (is-player-winner game-id tx-sender)) err-already-winner)
    
    ;; If less than 5 winners, add directly
    (if (< current-winners max-winners)
      (begin
        (add-winner-at-position game-id (+ current-winners u1) completion-time)
        (map-set games game-id
          (merge game { winners-count: (+ current-winners u1) })
        )
        (ok true)
      )
      ;; If 5 winners exist, check if faster than slowest
      (try-replace-slowest-winner game-id completion-time)
    )
  )
)

;; Add winner at specific position
(define-private (add-winner-at-position (game-id uint) (position uint) (completion-time uint))
  (let
    (
      (reward (calculate-reward-for-position game-id position))
    )
    (map-set game-winners
      { game-id: game-id, position: position }
      {
        player: tx-sender,
        completion-time: completion-time,
        reward-amount: reward,
        claimed: false
      }
    )
    true
  )
)

;; Try to replace slowest winner if current player is faster
(define-private (try-replace-slowest-winner (game-id uint) (completion-time uint))
  (let
    (
      (slowest-position (find-slowest-winner-position game-id))
      (slowest-winner (unwrap! (map-get? game-winners { game-id: game-id, position: slowest-position }) err-game-not-found))
    )
    (if (< completion-time (get completion-time slowest-winner))
      (begin
        (add-winner-at-position game-id slowest-position completion-time)
        (ok true)
      )
      err-max-winners-reached
    )
  )
)

;; Find position of slowest winner
(define-private (find-slowest-winner-position (game-id uint))
  (let
    (
      (w1 (map-get? game-winners { game-id: game-id, position: u1 }))
      (w2 (map-get? game-winners { game-id: game-id, position: u2 }))
      (w3 (map-get? game-winners { game-id: game-id, position: u3 }))
      (w4 (map-get? game-winners { game-id: game-id, position: u4 }))
      (w5 (map-get? game-winners { game-id: game-id, position: u5 }))
    )
    
    u5 
  )
)

;; Calculate reward based on position (1st gets most, 5th gets least)
(define-private (calculate-reward-for-position (game-id uint) (position uint))
  (let
    (
      (maybe-game (map-get? games game-id))
    )
    (match maybe-game
      game
        (let
          (
            (total-bounty (get bounty game))
            (platform-fee (/ (* total-bounty (var-get platform-fee-percentage)) u100))
            (distributable-bounty (- total-bounty platform-fee))
          )
          ;; Distribution: 40%, 25%, 20%, 10%, 5%
          (if (is-eq position u1)
            (/ (* distributable-bounty u40) u100)
            (if (is-eq position u2)
              (/ (* distributable-bounty u25) u100)
              (if (is-eq position u3)
                (/ (* distributable-bounty u20) u100)
                (if (is-eq position u4)
                  (/ (* distributable-bounty u10) u100)
                  (/ (* distributable-bounty u5) u100)
                )
              )
            )
          )
        )
      u0
    )
  )
)

;; Claim reward (for winners)
(define-public (claim-reward (game-id uint) (position uint))
  (let
    (
      (winner (unwrap! (map-get? game-winners { game-id: game-id, position: position }) err-game-not-found))
      (game (unwrap! (map-get? games game-id) err-game-not-found))
    )
    ;; Verify caller is the winner
    (asserts! (is-eq tx-sender (get player winner)) err-not-authorized)
    
    ;; Verify not already claimed
    (asserts! (not (get claimed winner)) err-already-completed)
    
    ;; Transfer reward
    (try! (as-contract (stx-transfer? (get reward-amount winner) tx-sender (get player winner))))
    
    ;; Mark as claimed
    (map-set game-winners
      { game-id: game-id, position: position }
      (merge winner { claimed: true })
    )
    
    (ok true)
  )
)

;; End game (creator only)
(define-public (end-game (game-id uint))
  (let
    (
      (game (unwrap! (map-get? games game-id) err-game-not-found))
    )
    (asserts! (is-eq tx-sender (get creator game)) err-not-authorized)
    
    (map-set games game-id
      (merge game { is-active: false })
    )
    
    (ok true)
  )
)

;; Admin function to update platform fee
(define-public (set-platform-fee (new-fee uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-not-authorized)
    (asserts! (<= new-fee u20) err-not-authorized) ;; Max 20% fee
    (var-set platform-fee-percentage new-fee)
    (ok true)
  )
)