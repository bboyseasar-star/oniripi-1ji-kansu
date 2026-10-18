/**
 * 1次関数の立式マスター 制御プログラム (main.js)
 * 
 * アプリの画面遷移、問題の進行、MathLive入力の監視と制御、
 * LaTeXの正規化によるロバストな正誤判定、段階的ヒント、結果表示、
 * および間違えた問題の「無限復習ループ」を制御します。
 */

// アプリのグローバル状態管理オブジェクト
const state = {
    questions: [],         // 今回解く問題リスト（通常5問）
    currentIndex: 0,       // 現在の問題インデックス (0〜4)
    score: 0,              // 現在の正解数
    answers: [],           // 各問題へのユーザーの解答を記録する配列
    hintCount: 0,          // 現在の問題でヒントを表示した回数
    isAnswered: false,     // 現在の問題の答え合わせが完了しているか
    isReviewMode: false,   // 間違えた問題の「復習モード」中かどうか
    failedQuestions: []    // 今回間違えた問題のリスト（復習モード用）
};

// 起動時の初期設定
window.addEventListener('DOMContentLoaded', () => {
    // 過去のベストスコアと学習履歴を読み込む
    loadBestScore();
    loadPlayHistory();
    
    // イベントリスナーの登録
    document.getElementById('btn-start').addEventListener('click', startDrill);
    document.getElementById('btn-check').addEventListener('click', checkAnswer);
    // マウス・タッチのクリック（detail>0）だけ、締め切った直後の連打を受けない。Enter（detail=0）はそのまま進む
    document.getElementById('btn-next').addEventListener('click', (e) => {
        if (e.detail > 0 && Date.now() < nextReadyAt) return;
        nextQuestion();
    });
    document.getElementById('btn-hint').addEventListener('click', showHint);
    document.getElementById('btn-quit').addEventListener('click', quitDrill);
    document.getElementById('btn-restart').addEventListener('click', restartDrill);
    document.getElementById('btn-review-failed').addEventListener('click', startReviewMode);
    document.getElementById('btn-home').addEventListener('click', goHome);
    document.getElementById('btn-clear-history').addEventListener('click', clearPlayHistory);
    
    // MathLive入力欄の初期化（Enter の設定は欄ごとに1回だけ）
    initAnswerField();
});

// ==================== ハイスコア管理 ====================
let bestScoreInMemory = null; // ローカルストレージが無効な環境（file:///起動など）でのメモリ上のフォールバック用

function loadBestScore() {
    const bestScoreEl = document.getElementById('best-score');
    try {
        const best = localStorage.getItem('oniripi_1ji_best');
        if (best !== null) {
            bestScoreEl.textContent = best;
            bestScoreInMemory = parseInt(best, 10);
        } else {
            bestScoreEl.textContent = bestScoreInMemory !== null ? bestScoreInMemory : '-';
        }
    } catch (e) {
        console.warn('localStorage is not available:', e);
        if (bestScoreInMemory !== null) {
            bestScoreEl.textContent = bestScoreInMemory;
        } else {
            bestScoreEl.textContent = '-';
        }
    }
}

function saveBestScore(score) {
    try {
        const best = localStorage.getItem('oniripi_1ji_best');
        const currentBest = best !== null ? parseInt(best, 10) : (bestScoreInMemory !== null ? bestScoreInMemory : -1);
        if (score > currentBest) {
            localStorage.setItem('oniripi_1ji_best', score);
            bestScoreInMemory = score;
        }
    } catch (e) {
        console.warn('localStorage is not available for saving:', e);
        if (bestScoreInMemory === null || score > bestScoreInMemory) {
            bestScoreInMemory = score;
        }
    }
}

// ==================== 学習履歴管理 ====================
let playHistoryInMemory = []; // localStorageが無効な環境用のメモリ上フォールバック

function loadPlayHistory() {
    try {
        const historyJson = localStorage.getItem('oniripi_1ji_history');
        let history = [];
        if (historyJson !== null) {
            history = JSON.parse(historyJson);
            playHistoryInMemory = history;
        } else {
            history = playHistoryInMemory;
        }
        renderHistoryList(history);
    } catch (e) {
        console.warn('localStorage is not available for reading history:', e);
        renderHistoryList(playHistoryInMemory);
    }
}

function savePlayHistory(score, total) {
    const dateStr = getFormattedDate();
    const isPassed = (score / total) >= 0.8; // 8割以上で合格
    const record = {
        date: dateStr,
        score: score,
        total: total,
        isPassed: isPassed
    };
    
    try {
        const historyJson = localStorage.getItem('oniripi_1ji_history');
        let history = [];
        if (historyJson !== null) {
            history = JSON.parse(historyJson);
        } else {
            history = [...playHistoryInMemory];
        }
        
        history.unshift(record); // 先頭に追加（最新順）
        if (history.length > 20) {
            history = history.slice(0, 20); // 最大20件に制限
        }
        
        localStorage.setItem('oniripi_1ji_history', JSON.stringify(history));
        playHistoryInMemory = history;
    } catch (e) {
        console.warn('localStorage is not available for saving history:', e);
        playHistoryInMemory.unshift(record);
        if (playHistoryInMemory.length > 20) {
            playHistoryInMemory = playHistoryInMemory.slice(0, 20);
        }
    }
}

async function clearPlayHistory() {
    if (await showConfirm({ title: '履歴を消す？', message: 'これまでの学習履歴と最高記録をすべて消します。\n（この操作は取り消せません）', okText: '消す', danger: true })) {
        try {
            localStorage.removeItem('oniripi_1ji_history');
            localStorage.removeItem('oniripi_1ji_best');
            playHistoryInMemory = [];
            bestScoreInMemory = null;
            
            // 表示の更新
            loadBestScore();
            loadPlayHistory();
        } catch (e) {
            console.warn('localStorage clear failed:', e);
            playHistoryInMemory = [];
            bestScoreInMemory = null;
            loadBestScore();
            loadPlayHistory();
        }
    }
}

function getFormattedDate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${y}/${m}/${d} ${hh}:${mm}`;
}

function renderHistoryList(history) {
    const listEl = document.getElementById('history-list');
    listEl.innerHTML = '';
    
    if (history.length === 0) {
        listEl.innerHTML = '<div class="history-empty">履歴はまだありません。<br>ドリルを解いてみよう！</div>';
        return;
    }
    
    history.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = `history-item ${item.isPassed ? 'pass' : 'fail'}`;
        
        const badgeClass = item.isPassed ? 'pass' : 'fail';
        const badgeText = item.isPassed ? '合格 💮' : '不合格 ❌';
        
        const dateEl = document.createElement('span');
        dateEl.className = 'history-date';
        dateEl.textContent = String(item.date);
        const scoreWrap = document.createElement('div');
        scoreWrap.className = 'history-score';
        const scoreEl = document.createElement('span');
        scoreEl.className = 'history-score-val';
        scoreEl.textContent = `${Number(item.score) || 0} / ${Number(item.total) || 0}問`;
        const badgeEl = document.createElement('span');
        badgeEl.className = `history-badge ${badgeClass}`;
        badgeEl.textContent = badgeText;
        scoreWrap.append(scoreEl, badgeEl);
        itemEl.append(dateEl, scoreWrap);
        listEl.appendChild(itemEl);
    });
}

// ==================== ドリルの開始と初期化 ====================
function startDrill() {
    state.isReviewMode = false;
    // 7つのテンプレートからランダムに5問を生成
    state.questions = window.QuestionGenerator.generateQuestions(5);
    state.currentIndex = 0;
    state.score = 0;
    state.answers = [];
    state.failedQuestions = [];
    
    initDrillScreen();
    showScreen('screen-drill');
}

// 画面遷移関数
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// ドリル画面の表示初期化
function initDrillScreen() {
    state.isAnswered = false;
    state.hintCount = 0;
    
    // 進捗メーターの更新
    document.getElementById('current-question-num').textContent = state.currentIndex + 1;
    document.getElementById('total-questions-num').textContent = state.questions.length;
    
    const progressPercent = ((state.currentIndex + 1) / state.questions.length) * 100;
    document.getElementById('progress-bar-fill').style.width = `${progressPercent}%`;
    
    document.getElementById('current-score').textContent = state.score;
    
    // UI要素のリセット
    document.getElementById('feedback-area').classList.remove('active');
    document.getElementById('feedback-msg').classList.add('hidden');
    document.getElementById('screen-drill').classList.remove('is-answered');
    clearTimeout(noticeTimer);
    const notice = document.querySelector('.input-notice');
    if (notice) { notice.textContent = INPUT_NOTICE; notice.classList.remove('is-alert'); }
    document.getElementById('feedback-msg').textContent = '';
    document.getElementById('correct-answer-block').classList.remove('active');
    document.getElementById('hint-display-area').classList.remove('active');
    document.getElementById('hint-display-area').innerHTML = '';
    
    document.getElementById('btn-check').classList.remove('hidden');
    document.getElementById('btn-next').classList.add('hidden');
    document.getElementById('btn-hint').classList.remove('hidden');
    
    // MathLive入力のリセット
    const mf = document.getElementById('answer-input');
    mf.value = '';
    mf.disabled = false;
    mf.readOnly = false;
    mf.removeAttribute('read-only');
    mf.setAttribute('contenteditable', 'true');
    
    // 問題文の表示
    const q = state.questions[state.currentIndex];
    document.getElementById('question-text').innerHTML = q.text;
    
    // MathJaxによる数式表示の更新
    if (window.MathJax) {
        // 問題文と、入力補助キーボード（x や y など）も一緒に数式レンダリングします
        MathJax.typesetPromise([
            document.getElementById('question-text'),
            document.querySelector('.keyboard-helper')
        ]).catch(err => {
            console.error('MathJax rendering error:', err);
        });
    }
    
    // 入力欄にフォーカスを当てる
    setTimeout(() => focusField(mf), 100);
}

// 欄にカーソルを戻す。締め切り→解除のあと MathLive 0.98.4 の focus() が効かないことがあるので、
// 効かなかったときは欄の中の入力の受け口（keyboard-sink）に直接フォーカスする
function focusField(mf) {
  if (!mf) return;
  try { mf.focus(); } catch (e) {}
  if (document.activeElement !== mf) {
    const sink = mf.shadowRoot && mf.shadowRoot.querySelector('.ML__keyboard-sink');
    if (sink) { try { sink.focus(); } catch (e) {} }
  }
}
// 欄の Enter（物理キーボードの keydown は部品が受ける）と、仮想キーボードの ⏎ をまとめて1つの処理にする。
// MathLive 0.98.4 の仮想キーボードの ⏎ は keydown を出さず、beforeinput（inputType 'insertLineBreak'）だけが届く。
// 物理キーボードの Enter では beforeinput は届かないが、念のため 350ms 以内の2回目は受けない（二重採点よけ）。
function bindFieldEnter(mf, fn) {
  let last = 0;
  const run = () => { const t = Date.now(); if (t - last < 350) return; last = t; fn(); };
  GraderCore.setupMathField(mf, { onEnter: run });
  mf.addEventListener('beforeinput', e => { if (e.inputType === 'insertLineBreak') { e.preventDefault(); run(); } });
}
// 締め切ったら仮想キーボードを閉じる（「次へ」を隠さないように）
function closeVirtualKeyboard(mf) {
  try { if (window.mathVirtualKeyboard) window.mathVirtualKeyboard.hide(); } catch (e) {}
  try { if (mf) mf.blur(); } catch (e) {}
}

// ==================== MathLive入力欄の初期化（1回だけ） ====================
// 値の書き換え（全角→半角など）はしない。全角・長音の負号・「．」は採点のときに部品がそろえる。
let answerFieldReady = false;
function initAnswerField() {
    const mf = document.getElementById('answer-input');
    if (!mf || answerFieldReady) return;
    answerFieldReady = true;

    const setup = () => bindFieldEnter(mf, () => { if (!state.isAnswered) checkAnswer(); else nextQuestion(); });
    // 定義前の欄に設定を書き込まないよう、math-field の定義を待ってから1回だけ設定する
    if (window.customElements && customElements.whenDefined) {
        customElements.whenDefined('math-field').then(setup).catch(setup);
    } else {
        setup();
    }

    // 入力補助キーボードのボタン
    document.querySelectorAll('.key-btn').forEach(btn => {
        if (btn.id === 'btn-clear-input') return;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (state.isAnswered) return;
            const val = btn.getAttribute('data-value');
            try { mf.insert(val); } catch (err) { mf.value += val; }
            mf.focus();
        });
    });

    // クリアボタン
    document.getElementById('btn-clear-input').addEventListener('click', (e) => {
        e.preventDefault();
        if (state.isAnswered) return;
        mf.value = '';
        mf.focus();
    });
}

// ==================== 正誤判定（DOM に触らない。回帰テストからも呼ぶ） ====================
// 部品 GraderCore で判定する。問題文はどれも「y を x の式で表しなさい」なので、
// 左右の入れ替え（-x+15=y）は ×「問題の指示に合わせて、y= の形で書こう」。
// アプリ側で足す決まり:
//   y= の無い式は ×「『y =』から書いて、式で表そう」、1x・-1x は ×「式は合っています。1x は x と書こう」、
//   空欄・空の枠は採点しない（status 'empty'）。
const KANSU_MESSAGES = {
    noEquals: '『y =』から書いて、式で表そう',
    oneCoef: '式は合っています。1x は x と書こう',
    unit: '単位は付けずに、式だけを書こう',
    emptySlot: '空いている枠（□）があるよ。数を入れてから答え合わせしよう',
    empty: '答えを入力してね！'
};
// 係数の 1 を書いた x（1x・-1x・1.0x・1·x・x·1・(-1)x）があるか。正規化した式（GraderCore.normalize の s）を見る。
// 11x・0.1x・1.05x・\frac{1}{2}x は含めない。値が正しいときだけ使う（未約分の \frac{2}{1}x などは部品が先に×にする）
function hasOneCoef(s) {
    s = String(s || '');
    return /(^|[^0-9.])1(?:\.0+)?\*?x/.test(s)          // 1x・1.0x・1*x（-1x もここ）
        || /x\*1(?:\.0+)?(?![0-9.])/.test(s)              // x*1
        || /[({]\s*[-+]?1(?:\.0+)?\s*[)}]\*?x/.test(s)    // (-1)x・(1)x・{1}x
        || /x\*[({]\s*[-+]?1(?:\.0+)?\s*[)}]/.test(s);   // x*(-1)
}
// 式の終わりに単位（円・cm・g・℃ など）を付けたか
const UNIT_TAIL = /(\\(?:text|mathrm|operatorname)\{[^{}]*\}|円|個|分|度|kg|km|mm|cm|m|g|L|\u2103|\u00B0C?|\^\{?\\(?:circ|degree)\}?C?|\\degree(?:\s*C)?)\s*$/; // ° は \degree・^{\degree}・{}^{\degree}・° のどれでも
function hasUnitTail(raw) {
    const s = String(raw || '').replace(/[\uFF01-\uFF5E]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).trim();
    return UNIT_TAIL.test(s);
}
// 中身の無い枠：空の {}（\frac{}{}・y={}x など。MathLive が \placeholder を出さずに返すことがある）、□（\square）。
// {}^{\degree} のような「添字の土台」の {} は枠ではないので除く
function hasEmptyFracBox(raw) {
  const s = String(raw || '');
  return /\{\s*\}(?!\s*[\^_])/.test(s) || /\\square(?![A-Za-z])|\u25A1/.test(s);
}
function gradeAnswer(q, raws) {
    const raw = raws && raws.length ? raws[0] : '';
    // 空の枠が残っている（分数の枠だけ出した場合も）→ 枠のことを言って書き直し。何も無い → 入力を促す
    if (GraderCore.hasEmptySlot(raw) || hasEmptyFracBox(raw)) return { status: 'empty', reason: 'emptySlot' };
    if (GraderCore.isBlank(raw)) return { status: 'empty', reason: 'empty' };
    const n = GraderCore.normalize(raw);
    if (n.s != null && n.s.indexOf('=') < 0) return { status: 'wrong', reason: 'noEquals' };
    const r = GraderCore.gradeEquation(raw, q.correctAnswers[0], { mode: 'solved', vars: ['x', 'y'], allowSwap: false });
    if (r.status === 'correct' && hasOneCoef(n.s)) return { status: 'wrong', reason: 'oneCoef', swapped: r.swapped };
    if (r.status !== 'correct' && hasUnitTail(raw)) return { status: 'wrong', reason: 'unit' };
    return r;
}
function gradeMessage(r) {
    if (!r) return '';
    if (Object.prototype.hasOwnProperty.call(KANSU_MESSAGES, r.reason)) return KANSU_MESSAGES[r.reason];
    return GraderCore.message(r);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
// 生徒の入力（MathLive の LaTeX）を、値を読み替えずに MathJax で出せる形にする
function displayLatex(raw) {
    return String(raw || '')
        .replace(/[\uFF01-\uFF5E]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)) // 全角は半角にそろえて見せる
        .replace(/[\u2212\u30FC\uFF70\u2010-\u2015]/g, '-')
        .replace(/\\mleft/g, '\\left').replace(/\\mright/g, '\\right')
        .replace(/(?:\{\s*\})?\^\{?\\degree\}?|\\degree(?![A-Za-z])/g, '^{\\circ}') // ° は MathJax が知る ^{\circ} で見せる
        .replace(/\\placeholder(?:\[[^\]]*\])?\{[^{}]*\}/g, '\\square')
        .replace(/(?<![0-9.])([0-9]+)\/([0-9]+)(?![0-9.])/g, '\\frac{$1}{$2}') // 1/2 は縦分数で見せる（採点では部品が同じ値として読む）
        .replace(/\\differentialD/g, 'd').replace(/\\exponentialE/g, 'e').replace(/\\imaginaryI/g, 'i');
}
function correctLatex(q) { return q.correctAnswers[0].replace('y=', 'y = '); }

// 入力欄の下の案内を一時的に注意文にする（採点せずに書き直しを促すとき）
const INPUT_NOTICE = '※「y = ...」の形で入力してね（全角でも大丈夫）';
let noticeTimer = null;
function flashNotice(msg) {
    const el = document.querySelector('.input-notice');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-alert');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { el.textContent = INPUT_NOTICE; el.classList.remove('is-alert'); }, 1800);
}

// 「答え合わせ」の連打で、同じ位置に出る「次の問題へ」まで押してしまわないようにする
const NEXT_GUARD_MS = 400;
let nextReadyAt = 0;

// ギブアップしたときの表示（×と同じ流れ：正しい答えと解説を見せる）
function showGiveUpFeedback(q, typed) {
    const feedbackArea = document.getElementById('feedback-area');
    const badge = document.getElementById('feedback-badge');
    document.getElementById('feedback-msg').classList.add('hidden');
    feedbackArea.classList.add('active');
    badge.textContent = '🏳️ ギブアップ';
    badge.className = 'feedback-badge wrong';
    document.getElementById('user-ans-val').innerHTML = typed.trim() ? `\\(${escapeHtml(displayLatex(typed))}\\)` : '（なし）';
    document.getElementById('correct-ans-val').innerHTML = `\\(${correctLatex(q)}\\)`;
    document.getElementById('question-explanation').innerHTML = q.explanation;
    document.getElementById('correct-answer-block').classList.add('active');
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([feedbackArea]).catch(() => {});
}

// 画面内の確認ダイアログ。Promise で true/false を返す
function showConfirm({ title, message, okText = 'OK', cancelText = 'キャンセル', danger = false }) {
    return new Promise(resolve => {
        const ov = document.getElementById('modal-overlay'), card = document.getElementById('modal-card');
        const okBtn = document.getElementById('modal-ok'), cancelBtn = document.getElementById('modal-cancel');
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = message;
        okBtn.textContent = okText; cancelBtn.textContent = cancelText;
        document.getElementById('modal-icon').textContent = danger ? '⚠️' : '❓';
        card.classList.toggle('is-danger', danger);
        ov.classList.remove('hidden');
        const done = v => { ov.classList.add('hidden'); cleanup(); resolve(v); };
        const onOk = () => done(true), onCancel = () => done(false);
        const onBg = e => { if (e.target === ov) done(false); };
        function cleanup() {
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            ov.removeEventListener('click', onBg);
        }
        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        ov.addEventListener('click', onBg);
        setTimeout(() => { try { cancelBtn.focus(); } catch (e) {} }, 0);
    });
}

function lockAnswerField(mf) {
    document.getElementById('screen-drill').classList.add('is-answered');
    closeVirtualKeyboard(mf);
    mf.disabled = true;
    mf.readOnly = true;
    mf.setAttribute('read-only', '');
    mf.setAttribute('contenteditable', 'false');
}

// ==================== 答え合わせ処理 ====================
function checkAnswer() {
    if (state.isAnswered) return; // 採点済み・ギブアップ後は二重に採点しない
    const mf = document.getElementById('answer-input');
    const userVal = mf.value || '';
    const q = state.questions[state.currentIndex];
    const r = gradeAnswer(q, [userVal]);

    // 空欄・空の枠は採点せず、書き直しを促す（この問題は締め切らない）
    if (r.status === 'empty') {
        flashNotice(gradeMessage(r));
        mf.focus();
        return;
    }

    state.isAnswered = true;
    nextReadyAt = Date.now() + NEXT_GUARD_MS;
    lockAnswerField(mf);

    document.getElementById('btn-check').classList.add('hidden');
    document.getElementById('btn-next').classList.remove('hidden');
    document.getElementById('btn-hint').classList.add('hidden');

    const isCorrect = r.status === 'correct';
    const isTri = r.status === 'negDenominator';
    const feedbackArea = document.getElementById('feedback-area');
    const feedbackBadge = document.getElementById('feedback-badge');
    const feedbackMsg = document.getElementById('feedback-msg');
    const correctBlock = document.getElementById('correct-answer-block');
    feedbackArea.classList.add('active');

    const shownUser = displayLatex(userVal);
    state.answers.push({
        questionText: q.text,
        userAnswer: `\\(${shownUser}\\)`,
        correctAnswer: `\\(${correctLatex(q)}\\)`,
        isCorrect: isCorrect,
        status: r.status
    });

    const msg = gradeMessage(r);
    feedbackMsg.textContent = msg;
    feedbackMsg.classList.toggle('hidden', !msg || isCorrect);

    if (isCorrect) {
        state.score++;
        document.getElementById('current-score').textContent = state.score;
        feedbackBadge.textContent = '⭕ 正解！';
        feedbackBadge.className = 'feedback-badge correct';
        correctBlock.classList.remove('active');
        if (window.confetti) {
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        }
    } else {
        // ×と△（分母のマイナス・0点）は同じ流れ：正しい答えを見せて復習リストへ
        feedbackBadge.textContent = isTri ? '🔺 おしい！（0点）' : '❌ 残念、まちがい！';
        feedbackBadge.className = 'feedback-badge ' + (isTri ? 'partial' : 'wrong');
        document.getElementById('user-ans-val').innerHTML = `\\(${escapeHtml(shownUser)}\\)`;
        document.getElementById('correct-ans-val').innerHTML = `\\(${correctLatex(q)}\\)`;
        document.getElementById('question-explanation').innerHTML = q.explanation;
        correctBlock.classList.add('active');
        if (!state.failedQuestions.some(item => item.id === q.id)) {
            state.failedQuestions.push(q);
        }
    }
    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([feedbackArea]).catch(err => {
            console.error('MathJax feedback rendering error:', err);
        });
    }
    // 欄は締め切ったので、次の Enter は「次の問題へ」ボタンが受ける
    focusNextButton();
}

function focusNextButton() {
    setTimeout(() => {
        const btn = document.getElementById('btn-next');
        if (btn && !btn.classList.contains('hidden')) btn.focus();
    }, 0);
}

// ==================== ヒント表示システム ====================
async function showHint() {
    const q = state.questions[state.currentIndex];
    const hintDisplay = document.getElementById('hint-display-area');
    
    if (state.isAnswered || state.hintCount >= q.hints.length) return;

    if (state.hintCount === q.hints.length - 1) {
        const ok = await showConfirm({ title: '答えを見る？', message: '次のヒントは答えだよ！\n見ると不正解（ギブアップ）になります。', okText: '見る', danger: true });
        if (!ok || state.isAnswered) return;
    }
    
    hintDisplay.classList.add('active');
    
    let currentHintHtml = '';
    
    // これまでに開いたヒントをすべて並べて表示する
    for (let i = 0; i <= state.hintCount; i++) {
        const hintText = q.hints[i];
        
        // 警告付きのヒントかチェックする (最後から2番目の要素、かつ警告文を含む場合)
        if (hintText.includes('⚠️')) {
            currentHintHtml += `<div class="hint-warning">${hintText}</div>`;
        } else {
            const isAnswer = i === q.hints.length - 1;
            currentHintHtml += `<div class="hint-item${isAnswer ? ' hint-answer' : ''}"><span class="hint-num">${isAnswer ? '答え' : `ヒント${i + 1}`}:</span> ${hintText}</div>`;
        }
    }
    
    hintDisplay.innerHTML = currentHintHtml;
    
    // 数式の再レンダリング
    if (window.MathJax) {
        MathJax.typesetPromise([hintDisplay]).catch(err => {
            console.error('MathJax hint rendering error:', err);
        });
    }
    
    // スクロールを一番下に自動移動
    hintDisplay.scrollTop = hintDisplay.scrollHeight;
    
    // ヒントを使い切った（最後のヒントを表示した）場合の処理
    if (state.hintCount === q.hints.length - 1) {
        // 最後のヒント（答え）を表示した場合はギブアップ扱いにする
        state.isAnswered = true;
        const answerInput = document.getElementById('answer-input');
        lockAnswerField(answerInput);
        nextReadyAt = Date.now() + NEXT_GUARD_MS;
        const typed = answerInput.value || '';
        showGiveUpFeedback(q, typed);
        
        document.getElementById('btn-check').classList.add('hidden');
        document.getElementById('btn-next').classList.remove('hidden');
        document.getElementById('btn-hint').classList.add('hidden');
        
        // 誤答レコードとして追加
        const record = {
            questionText: q.text,
            userAnswer: typed.trim() ? `\\(${displayLatex(typed)}\\)（ギブアップ）` : 'ギブアップ（答えを確認）',
            correctAnswer: `\\(${correctLatex(q)}\\)`,
            isCorrect: false,
            status: 'gaveUp'
        };
        state.answers.push(record);
        focusNextButton();
        
        if (!state.failedQuestions.some(item => item.id === q.id)) {
            state.failedQuestions.push(q);
        }
    } else {
        // 次回のヒントカウントに進める
        state.hintCount++;
    }
}

// ==================== 次の問題・中断・終了 ====================
function nextQuestion() {
    state.currentIndex++;
    
    if (state.currentIndex < state.questions.length) {
        // 次の問題を表示
        initDrillScreen();
    } else {
        // 全問終了、結果画面へ
        showResultScreen();
    }
}

async function quitDrill() {
    if (await showConfirm({ title: 'ホームに戻る？', message: 'ドリルを中断します。そこまでの記録は保存されません。', okText: '戻る' })) {
        goHome();
    }
}

// ==================== 結果画面の表示 ====================
function showResultScreen() {
    showScreen('screen-result');
    
    // スコアの更新
    document.getElementById('final-correct-count').textContent = state.score;
    document.getElementById('final-total-count').textContent = state.questions.length;
    
    // ベストスコアの保存と更新
    saveBestScore(state.score);
    loadBestScore();
    
    // プレイ履歴の保存（復習モードでない通常モードの場合のみ記録）
    if (!state.isReviewMode) {
        savePlayHistory(state.score, state.questions.length);
    }
    loadPlayHistory();
    
    // スコアに応じた演出とメッセージ
    const emojiEl = document.getElementById('result-emoji');
    const titleEl = document.getElementById('result-title');
    const messageEl = document.getElementById('result-message');
    const reviewBtn = document.getElementById('btn-review-failed');
    
    const accuracy = state.score / state.questions.length;
    
    if (accuracy === 1.0) {
        emojiEl.textContent = '👑';
        titleEl.textContent = 'パーフェクトクリア！';
        messageEl.textContent = '素晴らしい！全問大正解！1次関数の立式はもうばっちりだね！';
        reviewBtn.classList.add('hidden'); // 間違えた問題がないので復習ボタンは隠す
        
        // 豪華なコンフェッティ演出（両サイドから発射）
        triggerPerfectConfetti();
    } else if (accuracy >= 0.8) {
        emojiEl.textContent = '🎉';
        titleEl.textContent = '目標達成！クリア！';
        messageEl.textContent = '合格ライン突破！よく頑張ったね！間違えた問題を復習して満点を目指そう！';
        reviewBtn.classList.remove('hidden');
    } else {
        emojiEl.textContent = '🔥';
        titleEl.textContent = 'お疲れさま！再挑戦しよう！';
        messageEl.textContent = 'まずは間違えた問題を復習して、解き方のコツをつかもう！';
        reviewBtn.classList.remove('hidden');
    }
    
    // 振り返りリストの生成
    buildReviewList();
}

// パーフェクト時の紙吹雪演出
function triggerPerfectConfetti() {
    if (!window.confetti) return;
    const duration = 2.5 * 1000;
    const end = Date.now() + duration;

    (function frame() {
        confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
        });
        confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }());
}

// 振り返りリストのHTML作成
function buildReviewList() {
    const listContainer = document.getElementById('review-list');
    listContainer.innerHTML = '';
    
    state.answers.forEach((ans, index) => {
        const item = document.createElement('div');
        item.className = 'review-item';
        
        const isTri = ans.status === 'negDenominator';
        const statusText = ans.isCorrect ? '正解' : (isTri ? 'おしい（0点）' : 'まちがい');
        const statusClass = ans.isCorrect ? 'correct' : (isTri ? 'partial' : 'wrong');
        
        // ユーザー解答のスタイル調整
        const userAnsClass = ans.isCorrect ? 'correct' : 'user-wrong';
        
        item.innerHTML = `
            <div class="review-item-header">
                <span class="review-item-num">第 ${index + 1} 問</span>
                <span class="review-item-status ${statusClass}">${statusText}</span>
            </div>
                <div class="review-item-text">${ans.questionText}</div>
                <div class="review-item-answers">
                <div>あなたの解答: <span class="review-ans ${userAnsClass}">${escapeHtml(ans.userAnswer)}</span></div>
                ${!ans.isCorrect ? `<div>正しい答え: <span class="review-ans correct">${escapeHtml(ans.correctAnswer)}</span></div>` : ''}
            </div>
        `;
        listContainer.appendChild(item);
    });
    
    // 振り返りリスト内の数式のレンダリング
    if (window.MathJax) {
        MathJax.typesetPromise([listContainer]).catch(err => {
            console.error('MathJax review list rendering error:', err);
        });
    }
}

// ==================== 復習モードの制御 ====================
function startReviewMode() {
    if (state.failedQuestions.length === 0) return;
    
    state.isReviewMode = true;
    
    // 間違えた問題リストを今回の問題リストに置き換える
    state.questions = [...state.failedQuestions];
    state.currentIndex = 0;
    state.score = 0;
    state.answers = [];
    state.failedQuestions = []; // 今回間違えたものは、次の復習ループのためにクリアして再収集
    
    initDrillScreen();
    showScreen('screen-drill');
}

// ==================== その他の遷移ボタン ====================
function restartDrill() {
    startDrill();
}

function goHome() {
    showScreen('screen-start');
    loadBestScore();
    loadPlayHistory();
}
