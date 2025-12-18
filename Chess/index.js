// Chess vs AI - Naty Games
// Minimax with alpha-beta pruning, move history, undo, sound, flip board

'use strict';

// ============================================================
// CONSTANTS
// ============================================================

const FILES = ['a','b','c','d','e','f','g','h'];

const PIECE_UNICODE = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟'
};

const PIECE_VALUE = { p:100, n:320, b:330, r:500, q:900, k:20000 };

const PIECE_TABLES = {
  p: [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [ 5,  5, 10, 25, 25, 10,  5,  5],
    [ 0,  0,  0, 20, 20,  0,  0,  0],
    [ 5, -5,-10,  0,  0,-10, -5,  5],
    [ 5, 10, 10,-20,-20, 10, 10,  5],
    [ 0,  0,  0,  0,  0,  0,  0,  0]
  ],
  n: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ],
  b: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ],
  r: [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [ 0,  0,  0,  5,  5,  0,  0,  0]
  ],
  q: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [ -5,  0,  5,  5,  5,  5,  0, -5],
    [  0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
  ],
  k: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [ 20, 20,  0,  0,  0,  0, 20, 20],
    [ 20, 30, 10,  0,  0, 10, 30, 20]
  ]
};

// ============================================================
// GAME STATE
// ============================================================

let state = {};

function freshState() {
  return {
    board: initialBoard(),
    turn: 'w',
    castling: { wK:true, wQ:true, bK:true, bQ:true },
    enPassant: null,
    history: [],       // array of snapshots for undo
    moveLog: [],       // [{num, white, black}]
    capturedW: [],
    capturedB: [],
    selected: null,
    legalMoves: [],
    lastMove: null,
    flipped: false,
    gameOver: false,
    playerColor: 'w',
    aiThinking: false,
    pendingPromo: null  // {fr,fc,tr,tc} waiting for user choice
  };
}

function initialBoard() {
  return [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R']
  ];
}

// ============================================================
// PIECE HELPERS
// ============================================================

const isWhite  = p => p && p === p.toUpperCase();
const isBlack  = p => p && p === p.toLowerCase();
const colorOf  = p => p ? (isWhite(p) ? 'w' : 'b') : null;
const inBounds = (r,c) => r >= 0 && r < 8 && c >= 0 && c < 8;

// ============================================================
// MOVE GENERATION
// ============================================================

function rawMoves(board, r, c, enPassant) {
  const p = board[r][c];
  if (!p) return [];
  const moves = [];
  const add = (nr, nc) => { if (inBounds(nr, nc)) moves.push([nr, nc]); };
  const type = p.toLowerCase();
  const mine = colorOf(p);

  if (type === 'p') {
    const dir  = isWhite(p) ? -1 : 1;
    const start = isWhite(p) ? 6 : 1;
    if (inBounds(r+dir, c) && !board[r+dir][c]) {
      add(r+dir, c);
      if (r === start && !board[r+dir][c] && !board[r+2*dir][c]) add(r+2*dir, c);
    }
    for (const dc of [-1, 1]) {
      if (inBounds(r+dir, c+dc)) {
        const t = board[r+dir][c+dc];
        if (t && colorOf(t) !== mine) add(r+dir, c+dc);
        if (enPassant && enPassant[0] === r+dir && enPassant[1] === c+dc) add(r+dir, c+dc);
      }
    }
  }

  if (type === 'n') {
    for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const nr = r+dr, nc = c+dc;
      if (inBounds(nr,nc) && colorOf(board[nr][nc]) !== mine) add(nr, nc);
    }
  }

  if (type === 'b' || type === 'q') {
    for (const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
      let nr=r+dr, nc=c+dc;
      while (inBounds(nr,nc)) {
        if (colorOf(board[nr][nc]) === mine) break;
        add(nr, nc);
        if (board[nr][nc]) break;
        nr+=dr; nc+=dc;
      }
    }
  }

  if (type === 'r' || type === 'q') {
    for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      let nr=r+dr, nc=c+dc;
      while (inBounds(nr,nc)) {
        if (colorOf(board[nr][nc]) === mine) break;
        add(nr, nc);
        if (board[nr][nc]) break;
        nr+=dr; nc+=dc;
      }
    }
  }

  if (type === 'k') {
    for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
      const nr=r+dr, nc=c+dc;
      if (inBounds(nr,nc) && colorOf(board[nr][nc]) !== mine) add(nr, nc);
    }
  }

  return moves;
}

function isAttacked(board, r, c, byColor) {
  for (let rr=0; rr<8; rr++) for (let cc=0; cc<8; cc++) {
    const p = board[rr][cc];
    if (p && colorOf(p) === byColor) {
      if (rawMoves(board, rr, cc, null).some(([mr,mc]) => mr===r && mc===c)) return true;
    }
  }
  return false;
}

function findKing(board, col) {
  const king = col === 'w' ? 'K' : 'k';
  for (let r=0; r<8; r++) for (let c=0; c<8; c++) if (board[r][c] === king) return [r,c];
  return null;
}

function inCheck(board, col) {
  const pos = findKing(board, col);
  if (!pos) return false;
  return isAttacked(board, pos[0], pos[1], col === 'w' ? 'b' : 'w');
}

function applyMove(board, fr, fc, tr, tc, enPassant, castling, promoChoice) {
  const nb = board.map(row => [...row]);
  const p  = nb[fr][fc];
  const newCast = { ...castling };
  let newEp = null;

  if (p === 'P' && fr === 6 && tr === 4) newEp = [5, fc];
  if (p === 'p' && fr === 1 && tr === 3) newEp = [2, fc];

  if (p === 'K') { newCast.wK = false; newCast.wQ = false; }
  if (p === 'k') { newCast.bK = false; newCast.bQ = false; }
  if (fr===7 && fc===0) newCast.wQ = false;
  if (fr===7 && fc===7) newCast.wK = false;
  if (fr===0 && fc===0) newCast.bQ = false;
  if (fr===0 && fc===7) newCast.bK = false;

  // Castling rook moves
  if (p === 'K' && fc===4 && tc===6) { nb[7][5]=nb[7][7]; nb[7][7]=null; }
  if (p === 'K' && fc===4 && tc===2) { nb[7][3]=nb[7][0]; nb[7][0]=null; }
  if (p === 'k' && fc===4 && tc===6) { nb[0][5]=nb[0][7]; nb[0][7]=null; }
  if (p === 'k' && fc===4 && tc===2) { nb[0][3]=nb[0][0]; nb[0][0]=null; }

  // En passant capture
  if (enPassant && (p==='P'||p==='p') && tr===enPassant[0] && tc===enPassant[1]) {
    nb[fr][tc] = null;
  }

  nb[tr][tc] = p;
  nb[fr][fc] = null;

  // Promotion
  if (p === 'P' && tr === 0) nb[tr][tc] = promoChoice || 'Q';
  if (p === 'p' && tr === 7) nb[tr][tc] = promoChoice || 'q';

  return { nb, newEp, newCast };
}

function getLegalMoves(board, r, c, enPassant, castling) {
  const p = board[r][c];
  if (!p) return [];
  const mine = colorOf(p);
  const type = p.toLowerCase();
  const moves = rawMoves(board, r, c, enPassant);
  const legal = [];

  if (type === 'k') {
    const opp = mine === 'w' ? 'b' : 'w';
    if (mine==='w' && castling.wK && !board[7][5] && !board[7][6] && !inCheck(board,'w') && !isAttacked(board,7,5,opp) && !isAttacked(board,7,6,opp)) legal.push([7,6]);
    if (mine==='w' && castling.wQ && !board[7][3] && !board[7][2] && !board[7][1] && !inCheck(board,'w') && !isAttacked(board,7,3,opp) && !isAttacked(board,7,2,opp)) legal.push([7,2]);
    if (mine==='b' && castling.bK && !board[0][5] && !board[0][6] && !inCheck(board,'b') && !isAttacked(board,0,5,'w') && !isAttacked(board,0,6,'w')) legal.push([0,6]);
    if (mine==='b' && castling.bQ && !board[0][3] && !board[0][2] && !board[0][1] && !inCheck(board,'b') && !isAttacked(board,0,3,'w') && !isAttacked(board,0,2,'w')) legal.push([0,2]);
  }

  for (const [tr,tc] of moves) {
    const { nb } = applyMove(board, r, c, tr, tc, enPassant, castling);
    if (!inCheck(nb, mine)) legal.push([tr, tc]);
  }

  return legal;
}

function allLegalMoves(board, col, enPassant, castling) {
  const moves = [];
  for (let r=0; r<8; r++) for (let c=0; c<8; c++) {
    if (board[r][c] && colorOf(board[r][c]) === col) {
      for (const [tr,tc] of getLegalMoves(board, r, c, enPassant, castling)) {
        moves.push([r, c, tr, tc]);
      }
    }
  }
  return moves;
}

// ============================================================
// EVALUATION
// ============================================================

function evaluate(board) {
  let score = 0;
  for (let r=0; r<8; r++) for (let c=0; c<8; c++) {
    const p = board[r][c];
    if (!p) continue;
    const type  = p.toLowerCase();
    const val   = PIECE_VALUE[type];
    const table = PIECE_TABLES[type];
    const tval  = isWhite(p) ? table[r][c] : table[7-r][c];
    score += isWhite(p) ? (val + tval) : -(val + tval);
  }
  return score;
}

// ============================================================
// MINIMAX
// ============================================================

function minimax(board, depth, alpha, beta, maximizing, enPassant, castling) {
  const col = maximizing ? 'w' : 'b';
  if (depth === 0) return evaluate(board);

  const moves = allLegalMoves(board, col, enPassant, castling);
  if (moves.length === 0) {
    if (inCheck(board, col)) return maximizing ? -99999 : 99999;
    return 0;
  }

  if (maximizing) {
    let best = -Infinity;
    for (const [fr,fc,tr,tc] of moves) {
      const { nb, newEp, newCast } = applyMove(board, fr, fc, tr, tc, enPassant, castling);
      best = Math.max(best, minimax(nb, depth-1, alpha, beta, false, newEp, newCast));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const [fr,fc,tr,tc] of moves) {
      const { nb, newEp, newCast } = applyMove(board, fr, fc, tr, tc, enPassant, castling);
      best = Math.min(best, minimax(nb, depth-1, alpha, beta, true, newEp, newCast));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

// ============================================================
// SOUND
// ============================================================

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function playSound(type) {
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const configs = {
      move:    { freq: 440, type: 'sine',   dur: 0.08, vol: 0.15 },
      capture: { freq: 220, type: 'square', dur: 0.12, vol: 0.12 },
      check:   { freq: 600, type: 'sine',   dur: 0.18, vol: 0.18 },
      end:     { freq: 180, type: 'sine',   dur: 0.5,  vol: 0.15 },
      select:  { freq: 520, type: 'sine',   dur: 0.05, vol: 0.08 }
    };

    const cfg = configs[type] || configs.move;
    osc.type = cfg.type;
    osc.frequency.setValueAtTime(cfg.freq, ctx.currentTime);
    if (type === 'end') {
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + cfg.dur);
    }
    gain.gain.setValueAtTime(cfg.vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + cfg.dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + cfg.dur);
  } catch (e) {
    // silent fail
  }
}

// ============================================================
// NOTATION
// ============================================================

function toNotation(board, fr, fc, tr, tc, captured, isCheckAfter, isMate) {
  const p = board[fr][fc];
  const type = p.toLowerCase();
  const file = FILES[tc];
  const rank = 8 - tr;

  let notation = '';
  if (type === 'k' && Math.abs(tc - fc) === 2) {
    notation = tc > fc ? 'O-O' : 'O-O-O';
  } else {
    const pieceChar = type === 'p' ? '' : type.toUpperCase();
    const captureStr = captured ? 'x' : '';
    const fromFile = type === 'p' && captured ? FILES[fc] : '';
    notation = `${pieceChar}${fromFile}${captureStr}${file}${rank}`;
    if ((p === 'P' && tr === 0) || (p === 'p' && tr === 7)) notation += '=Q';
  }

  if (isMate) notation += '#';
  else if (isCheckAfter) notation += '+';

  return notation;
}

// ============================================================
// EVAL BAR UPDATE
// ============================================================

function updateEvalBar(board, col) {
  const raw = evaluate(board);
  const clamped = Math.max(-900, Math.min(900, raw));
  const whitePct = 50 + (clamped / 900) * 45;
  const fill = document.getElementById('evalFill');
  const score = document.getElementById('evalScore');
  if (fill) fill.style.width = whitePct.toFixed(1) + '%';
  if (score) {
    const display = (raw / 100).toFixed(1);
    score.textContent = raw > 0 ? '+' + display : display;
  }
}

// ============================================================
// HISTORY PANEL
// ============================================================

function updateHistory() {
  const el = document.getElementById('historyList');
  if (!el) return;
  const log = state.moveLog;
  if (log.length === 0) {
    el.innerHTML = '<p class="history-empty">No moves yet</p>';
    return;
  }
  const table = document.createElement('table');
  table.className = 'history-table';
  for (const entry of log) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${entry.num}.</td><td>${entry.white || ''}</td><td>${entry.black || ''}</td>`;
    table.appendChild(tr);
  }
  el.innerHTML = '';
  el.appendChild(table);
  el.scrollTop = el.scrollHeight;
}

// ============================================================
// RENDER BOARD
// ============================================================

function renderBoard() {
  const el = document.getElementById('chessBoard');
  if (!el) return;

  el.innerHTML = '';

  const flipped = state.flipped;
  const kingPos = findKing(state.board, state.turn);
  const checked = inCheck(state.board, state.turn);

  const rows = flipped ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0];
  const cols = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];

  // rank labels
  const rankEl = document.getElementById('rankLabels');
  if (rankEl) {
    rankEl.innerHTML = '';
    for (const r of rows) {
      const d = document.createElement('div');
      d.className = 'rank-label';
      d.textContent = 8 - r;
      rankEl.appendChild(d);
    }
  }

  // file labels
  const fileEl = document.getElementById('fileLabels');
  if (fileEl) {
    fileEl.innerHTML = '';
    for (const c of cols) {
      const d = document.createElement('div');
      d.className = 'file-label';
      d.textContent = FILES[c];
      fileEl.appendChild(d);
    }
  }

  for (const r of rows) {
    for (const c of cols) {
      const sq = document.createElement('div');
      const isLight = (r + c) % 2 === 0;
      sq.className = 'sq ' + (isLight ? 'light' : 'dark');
      sq.dataset.r = r;
      sq.dataset.c = c;

      const isSelected  = state.selected && state.selected[0] === r && state.selected[1] === c;
      const isLastFrom   = state.lastMove && state.lastMove[0][0] === r && state.lastMove[0][1] === c;
      const isLastTo     = state.lastMove && state.lastMove[1][0] === r && state.lastMove[1][1] === c;
      const isHint       = state.legalMoves.some(([mr,mc]) => mr === r && mc === c);
      const isCheck      = checked && kingPos && kingPos[0] === r && kingPos[1] === c;

      if (isSelected)           sq.classList.add('selected');
      else if (isLastFrom || isLastTo) sq.classList.add('last-move');
      if (isCheck)              sq.classList.add('in-check');
      if (isHint) {
        sq.classList.add('hint');
        if (state.board[r][c]) sq.classList.add('occupied');
      }

      const p = state.board[r][c];
      if (p) {
        const span = document.createElement('span');
        span.className = 'piece ' + (isWhite(p) ? 'white-piece' : 'black-piece');
        span.textContent = PIECE_UNICODE[p];
        sq.appendChild(span);
      }

      sq.addEventListener('click', () => onSquareClick(r, c));
      el.appendChild(sq);
    }
  }

  updateEvalBar(state.board, state.turn);
  renderPlayerStatus();
}

function renderPlayerStatus() {
  const wRow = document.getElementById('playerWhite');
  const bRow = document.getElementById('playerBlack');
  if (!wRow || !bRow) return;

  wRow.classList.toggle('active-player', state.turn === 'w' && !state.gameOver);
  bRow.classList.toggle('active-player', state.turn === 'b' && !state.gameOver);

  const dots = document.getElementById('thinkDots');
  if (dots) {
    dots.innerHTML = state.aiThinking
      ? '<span class="think-dot">.</span><span class="think-dot">.</span><span class="think-dot">.</span>'
      : '';
  }
}

function renderCaptured() {
  const bEl = document.getElementById('capBlack');
  const wEl = document.getElementById('capWhite');
  if (bEl) bEl.textContent = state.capturedW.map(p => PIECE_UNICODE[p]).join('');
  if (wEl) wEl.textContent = state.capturedB.map(p => PIECE_UNICODE[p]).join('');
}

function showMessage(msg) {
  const el = document.getElementById('gameMessage');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideMessage() {
  const el = document.getElementById('gameMessage');
  if (el) el.classList.add('hidden');
}

// ============================================================
// PROMOTION DIALOG
// ============================================================

function showPromoDialog(isWhitePiece, callback) {
  const outer = document.getElementById('boardOuter');
  const overlay = document.createElement('div');
  overlay.className = 'promo-overlay';

  const pieces = isWhitePiece ? ['Q','R','B','N'] : ['q','r','b','n'];
  const box = document.createElement('div');
  box.className = 'promo-box';

  const title = document.createElement('div');
  title.className = 'promo-title';
  title.textContent = 'Promote pawn';
  box.appendChild(title);

  const row = document.createElement('div');
  row.className = 'promo-pieces';

  for (const piece of pieces) {
    const btn = document.createElement('div');
    btn.className = 'promo-piece ' + (isWhitePiece ? 'white-piece' : 'black-piece');
    btn.textContent = PIECE_UNICODE[piece];
    btn.style.cssText = 'color:' + (isWhitePiece ? '#fff' : '#1a1714');
    btn.addEventListener('click', () => {
      overlay.remove();
      callback(piece);
    });
    row.appendChild(btn);
  }

  box.appendChild(row);
  overlay.appendChild(box);
  outer.appendChild(overlay);
}

// ============================================================
// PLAYER MOVE
// ============================================================

function onSquareClick(r, c) {
  if (state.gameOver || state.aiThinking || state.pendingPromo) return;
  if (state.turn !== state.playerColor) return;

  const p = state.board[r][c];

  if (state.selected) {
    const [sr, sc] = state.selected;
    const isLegal = state.legalMoves.some(([mr,mc]) => mr === r && mc === c);

    if (isLegal) {
      const piece = state.board[sr][sc];
      const isPromo = (piece === 'P' && r === 0) || (piece === 'p' && r === 7);

      if (isPromo && state.playerColor === colorOf(piece)) {
        state.pendingPromo = { fr:sr, fc:sc, tr:r, tc:c };
        state.selected = null;
        state.legalMoves = [];
        renderBoard();
        showPromoDialog(isWhite(piece), (choice) => {
          const { fr, fc, tr, tc } = state.pendingPromo;
          state.pendingPromo = null;
          commitMove(fr, fc, tr, tc, choice);
        });
        return;
      }

      state.selected = null;
      state.legalMoves = [];
      commitMove(sr, sc, r, c, null);
      return;
    }
  }

  if (p && colorOf(p) === state.playerColor) {
    state.selected = [r, c];
    state.legalMoves = getLegalMoves(state.board, r, c, state.enPassant, state.castling);
    playSound('select');
  } else {
    state.selected = null;
    state.legalMoves = [];
  }

  renderBoard();
}

function commitMove(fr, fc, tr, tc, promoChoice) {
  const captured = state.board[tr][tc];
  const movingPiece = state.board[fr][fc];

  // en passant capture
  let epCapture = null;
  if ((movingPiece==='P'||movingPiece==='p') && state.enPassant && tr===state.enPassant[0] && tc===state.enPassant[1]) {
    epCapture = state.board[fr][tc];
  }

  // snapshot for undo
  state.history.push({
    board:      state.board.map(row => [...row]),
    castling:   { ...state.castling },
    enPassant:  state.enPassant,
    lastMove:   state.lastMove,
    capturedW:  [...state.capturedW],
    capturedB:  [...state.capturedB],
    moveLog:    JSON.parse(JSON.stringify(state.moveLog)),
    turn:       state.turn
  });

  const { nb, newEp, newCast } = applyMove(state.board, fr, fc, tr, tc, state.enPassant, state.castling, promoChoice);
  state.board    = nb;
  state.enPassant = newEp;
  state.castling  = newCast;
  state.lastMove  = [[fr,fc],[tr,tc]];
  state.selected  = null;
  state.legalMoves = [];

  const actualCaptured = captured || epCapture;
  if (actualCaptured) {
    if (state.turn === 'w') state.capturedB.push(actualCaptured);
    else                    state.capturedW.push(actualCaptured);
    playSound('capture');
  } else {
    playSound('move');
  }

  // notation
  const oppColor = state.turn === 'w' ? 'b' : 'w';
  const oppMoves = allLegalMoves(state.board, oppColor, newEp, newCast);
  const isCheckNow = inCheck(state.board, oppColor);
  const isMate = isCheckNow && oppMoves.length === 0;
  const notation = toNotation(state.history[state.history.length-1].board, fr, fc, tr, tc, !!actualCaptured, isCheckNow, isMate);

  if (state.turn === 'w') {
    state.moveLog.push({ num: state.moveLog.length + 1, white: notation, black: '' });
  } else {
    if (state.moveLog.length > 0) state.moveLog[state.moveLog.length-1].black = notation;
  }

  renderCaptured();
  updateHistory();

  if (isCheckNow) playSound('check');

  const nextTurn = oppColor;
  state.turn = nextTurn;

  if (oppMoves.length === 0) {
    state.gameOver = true;
    if (isCheckNow) {
      const winner = state.turn === 'w' ? 'White wins!' : 'Black wins!';
      showMessage('Checkmate! ' + winner);
    } else {
      showMessage('Stalemate! Draw.');
    }
    playSound('end');
    renderBoard();
    return;
  }

  if (isCheckNow) {
    const checkMsg = oppColor === state.playerColor ? 'Check!' : 'Check!';
    showMessage(checkMsg);
    setTimeout(hideMessage, 1800);
  } else {
    hideMessage();
  }

  renderBoard();

  if (state.turn !== state.playerColor) {
    triggerAI();
  }
}

// ============================================================
// AI
// ============================================================

function triggerAI() {
  if (state.gameOver) return;
  state.aiThinking = true;
  renderPlayerStatus();

  const depth = parseInt(document.getElementById('diffSelect').value, 10);

  // Generate a random delay between 1000ms (1s) and 2500ms (2.5s)
  const thinkTime = Math.floor(Math.random() * 1000) + 1000;

  setTimeout(() => {
    const aiCol = state.playerColor === 'w' ? 'b' : 'w';
    const moves = allLegalMoves(state.board, aiCol, state.enPassant, state.castling);

    if (!moves.length) {
      state.aiThinking = false;
      renderPlayerStatus();
      return;
    }

    let bestScore = -Infinity;
    let bestMove  = null;

    for (const [fr,fc,tr,tc] of moves) {
      const { nb, newEp, newCast } = applyMove(state.board, fr, fc, tr, tc, state.enPassant, state.castling);
      const score = aiCol === 'b'
        ? -minimax(nb, depth-1, -Infinity, Infinity, true, newEp, newCast)
        :  minimax(nb, depth-1, -Infinity, Infinity, false, newEp, newCast);
      if (score > bestScore) { bestScore = score; bestMove = [fr,fc,tr,tc]; }
    }

    state.aiThinking = false;
    if (bestMove) commitMove(...bestMove, null);
    
  }, thinkTime); 
}
// ============================================================
// UNDO
// ============================================================

function undoMove() {
  if (state.history.length === 0) return;
  // Undo two half-moves (player + AI) if AI already moved, else one
  const steps = state.history.length >= 2 && state.turn === state.playerColor ? 2 : 1;
  for (let i = 0; i < steps && state.history.length > 0; i++) {
    const snap = state.history.pop();
    Object.assign(state, snap);
  }
  state.selected   = null;
  state.legalMoves = [];
  state.gameOver   = false;
  state.aiThinking = false;
  state.pendingPromo = null;
  hideMessage();
  renderBoard();
  renderCaptured();
  updateHistory();
}

// ============================================================
// NEW GAME
// ============================================================

function newGame() {
  const playerColor = document.getElementById('colorSelect').value;
  state = freshState();
  state.playerColor = playerColor;
  state.flipped = playerColor === 'b';
  hideMessage();
  renderBoard();
  renderCaptured();
  updateHistory();

  if (playerColor === 'b') {
    triggerAI();
  }
}

// ============================================================
// DARK MODE
// ============================================================

function initTheme() {
  const saved = localStorage.getItem('naty-chess-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
  updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
  const icon = document.querySelector('.theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☾' : '☀';
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme;
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('naty-chess-theme', next);
  updateThemeIcon(next);
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('newGameBtn').addEventListener('click', newGame);
  document.getElementById('undoBtn').addEventListener('click', undoMove);
  document.getElementById('flipBtn').addEventListener('click', () => {
    state.flipped = !state.flipped;
    renderBoard();
  });

  newGame();
});