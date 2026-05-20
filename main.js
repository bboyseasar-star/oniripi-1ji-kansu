/**
 * 1次関数の立式アプリ「鬼リピ」制御プログラム (main.js)
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
    document.getElementById('btn-next').addEventListener('click', nextQuestion);
    document.getElementById('btn-hint').addEventListener('click', showHint);
    document.getElementById('btn-quit').addEventListener('click', quitDrill);
    document.getElementById('btn-restart').addEventListener('click', restartDrill);
    document.getElementById('btn-review-failed').addEventListener('click', startReviewMode);
    document.getElementById('btn-home').addEventListener('click', goHome);
    document.getElementById('btn-clear-history').addEventListener('click', clearPlayHistory);
    
    // MathLive入力欄の初期化
    setupMathField();
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

function clearPlayHistory() {
    if (confirm('これまでの学習履歴と最高記録をすべて消去しますか？（この操作は取り消せません）')) {
        try {
            localStorage.removeItem('oniripi_1ji_history');
            localStorage.removeItem('oniripi_1ji_best');
            playHistoryInMemory = [];
            bestScoreInMemory = null;
            
            // 表示の更新
            loadBestScore();
            loadPlayHistory();
            alert('履歴をリセットしました。');
        } catch (e) {
            console.warn('localStorage clear failed:', e);
            playHistoryInMemory = [];
            bestScoreInMemory = null;
            loadBestScore();
            loadPlayHistory();
            alert('履歴をリセットしました。');
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
        
        itemEl.innerHTML = `
            <span class="history-date">${item.date}</span>
            <div class="history-score">
                <span class="history-score-val">${item.score} / ${item.total}問</span>
                <span class="history-badge ${badgeClass}">${badgeText}</span>
            </div>
        `;
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
    setTimeout(() => {
        mf.focus();
    }, 100);
}

// ==================== MathLive入力とIME対策 ====================
function setupMathField() {
    const mf = document.getElementById('answer-input');
    if (!mf) return;
    
    // 1. MathLive の Shadow DOM の中にある隠し入力エリア（textarea）を強制的に英語モードにする関数
    function enforceShadowDOMInputmode() {
        if (mf.shadowRoot) {
            const textarea = mf.shadowRoot.querySelector('textarea');
            if (textarea) {
                // オートフォーカス時に半角英数字入力をOSに促す設定をすべて付与
                textarea.setAttribute('inputmode', 'latin');
                textarea.setAttribute('autocorrect', 'off');
                textarea.setAttribute('autocapitalize', 'off');
                textarea.setAttribute('spellcheck', 'false');
                
                // Chromeなどの一部ブラウザでIME状態をリセットするためのハック
                // キーボードイベントの初期入力モードを英字に固定させる
                textarea.lang = 'en-US';
            }
        }
    }
    
    // 初回ロード時と、Shadow DOM が構築されるのを待って適用
    enforceShadowDOMInputmode();
    setTimeout(enforceShadowDOMInputmode, 500);
    
    // 2. フォーカス時に半角英数字入力を強制する属性を設定
    mf.setAttribute('inputmode', 'latin');
    
    // 3. Chromebookで日本語入力（IME）のまま入力された全角文字を監視し、半角に自動変換する
    mf.addEventListener('compositionend', (ev) => {
        const data = ev.data;
        if (data) {
            // 全角英数字や記号を半角にマッピング
            const converted = data
                .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
                .replace(/[ａ-ｚ]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
                .replace(/[Ａ-Ｚ]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
                .replace(/[＋]/g, '+')
                .replace(/[－ー−]/g, '-')
                .replace(/[＝]/g, '=')
                .replace(/[．。]/g, '.');
            
            // 入力欄をクリアして半角に直したものを挿入する
            mf.value = '';
            mf.insert(converted);
        }
    });
    
    // フォーカスを得るたびに英数字モードを指定し、Shadow DOM内も更新
    mf.addEventListener('focus', () => {
        mf.setAttribute('inputmode', 'latin');
        enforceShadowDOMInputmode();
    });
    
    // 4. 入力補助キーボードのボタンイベント登録
    document.querySelectorAll('.key-btn').forEach(btn => {
        if (btn.id === 'btn-clear-input') return;
        
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const val = btn.getAttribute('data-value');
            
            try {
                mf.insert(val);
            } catch (err) {
                mf.value += val;
            }
            mf.focus();
        });
    });
    
    // クリアボタンの処理
    document.getElementById('btn-clear-input').addEventListener('click', (e) => {
        e.preventDefault();
        mf.value = '';
        mf.focus();
    });
    
    // Enterキーが押されたら答え合わせを実行する
    mf.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (!state.isAnswered) {
                checkAnswer();
            } else {
                nextQuestion();
            }
        }
    });
}

// ==================== LaTeXの正規化と正誤判定 ====================

/**
 * MathLiveの出力するLaTeXの表記の揺れを吸収し、判定しやすい形に正規化します。
 * 
 * @param {string} latex 正規化対象のLaTeX文字列
 * @returns {string} スペースなどが除かれたクリーンな文字列
 */
function normalizeLatex(latex) {
    if (!latex) return '';
    let s = latex.toString().replace(/\s+/g, ''); // すべてのスペースを削除
    
    // MathLive特有の余計な修飾コマンドを削除
    s = s.replace(/\\left|\\right|\\mleft|\\mright|\\,|\\cdot|\\operatorname/g, '');
    
    // 記号の統一（等号、不等号、プラスマイナス）
    s = s.replace(/\\pm/g, '±')
         .replace(/\\lt/g, '<')
         .replace(/\\gt/g, '>')
         .replace(/\\le/g, '≤')
         .replace(/\\ge/g, '≥');
         
    // 分数表記のブレース統一（1文字の場合のブレース省略補完）
    // 例: \frac12 -> \frac{1}{2}
    s = s.replace(/\\frac([^{])([^{])/g, '\\frac{$1}{$2}');
    s = s.replace(/\\frac{([^{])}([^{])/g, '\\frac{$1}{$2}');
    s = s.replace(/\\frac([^{]){([^{]+)}/g, '\\frac{$1}{$2}');
    
    // 負の分数の表記揺れ統一
    // 例: -\frac{a}{b} と \frac{-a}{b} を同じ \frac{-a}{b} に統一する
    s = s.replace(/-\\frac{([^}]+)}{([^}]+)}/g, '\\frac{-$1}{$2}');
    
    // 累乗表記のブレース統一
    // 例: ^2 -> ^{2}
    s = s.replace(/\^([^{])/g, '^{$1}');
    
    return s;
}

/**
 * ユーザーが入力した数式が、正解パターンのいずれかと一致するか判定します。
 * 
 * @param {string} userInput ユーザーの入力（MathLive値）
 * @param {Array} correctAnswers 正解のLaTeX配列 (例: ["y=2x+3", "y=3+2x"])
 * @returns {boolean} 正解ならtrue
 */
function judgeAnswer(userInput, correctAnswers) {
    // 1. 入力値のクリーンアップ（スペース等を詰める）
    let cleanInput = userInput.replace(/\s+/g, '');
    
    // 2. 「y = 」から入力させたいので、y= で始まっていない場合はその時点で不正解とする
    if (!cleanInput.startsWith('y=')) {
        return false;
    }
    
    // 3. ユーザー入力を正規化
    const normalizedInput = normalizeLatex(cleanInput);
    
    // 4. 定義されたすべての正解パターンと照合
    for (const correct of correctAnswers) {
        const normalizedCorrect = normalizeLatex(correct);
        if (normalizedInput === normalizedCorrect) {
            return true;
        }
    }
    
    return false;
}

// ==================== 答え合わせ処理 ====================
function checkAnswer() {
    const mf = document.getElementById('answer-input');
    const userVal = mf.value.trim();
    
    // 未入力の場合は何もしない
    if (!userVal) {
        alert('答えを入力してください。');
        mf.focus();
        return;
    }
    
    state.isAnswered = true;
    mf.disabled = true; // 入力欄をロック
    
    // ボタンの表示切り替え
    document.getElementById('btn-check').classList.add('hidden');
    document.getElementById('btn-next').classList.remove('hidden');
    document.getElementById('btn-hint').classList.add('hidden');
    
    const q = state.questions[state.currentIndex];
    
    // 正誤判定
    const isCorrect = judgeAnswer(userVal, q.correctAnswers);
    
    // フィードバック領域の初期化
    const feedbackArea = document.getElementById('feedback-area');
    const feedbackBadge = document.getElementById('feedback-badge');
    const correctBlock = document.getElementById('correct-answer-block');
    
    feedbackArea.classList.add('active');
    
    // ユーザー解答の表示用（スペースを入れて見やすく整形する。y= で始まっていれば y = に変換する）
    let displayUserVal = userVal.replace(/\s+/g, '');
    if (displayUserVal.startsWith('y=')) {
        displayUserVal = displayUserVal.replace('y=', 'y = ');
    }
    
    // 記録用のオブジェクトを作成（MathJaxで数式レンダリングさせるため \(\) で囲む）
    const record = {
        questionText: q.text,
        userAnswer: `\\(${displayUserVal}\\)`,
        correctAnswer: `\\(${q.correctAnswers[0].replace('y=', 'y = ')}\\)`,
        isCorrect: isCorrect
    };
    state.answers.push(record);
    
    if (isCorrect) {
        // --- 正解の場合 ---
        state.score++;
        document.getElementById('current-score').textContent = state.score;
        
        feedbackBadge.textContent = '⭕ 正解！';
        feedbackBadge.className = 'feedback-badge correct';
        correctBlock.classList.remove('active'); // 解説は隠す
        
        // ミニ紙吹雪演出（canvas-confetti）
        if (window.confetti) {
            confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.7 }
            });
        }
    } else {
        // --- 不正解の場合 ---
        feedbackBadge.textContent = '❌ 残念、まちがい！';
        feedbackBadge.className = 'feedback-badge wrong';
        
        // ユーザー解答と正しい答えの比較を表示
        // MathJaxで数式としてレンダリングするため、インナーHTMLに \(\) 囲みで代入します
        document.getElementById('user-ans-val').innerHTML = `\\(${displayUserVal}\\)`;
        // 代表的な正解を表示（1つ目のパターン）
        document.getElementById('correct-ans-val').innerHTML = `\\(${q.correctAnswers[0].replace('y=', 'y = ')}\\)`;
        
        // 解説文章を設定
        const expBox = document.getElementById('question-explanation');
        expBox.innerHTML = q.explanation;
        
        correctBlock.classList.add('active');
        
        // 数式を美しく表示するため MathJax に再レンダリングを依頼
        if (window.MathJax) {
            MathJax.typesetPromise([document.getElementById('correct-answer-block')]).catch(err => {
                console.error('MathJax explanation rendering error:', err);
            });
        }
        
        // 復習用に間違えた問題を記録
        // すでに登録されていないかチェックして重複登録を防ぐ
        if (!state.failedQuestions.some(item => item.id === q.id)) {
            state.failedQuestions.push(q);
        }
    }
}

// ==================== ヒント表示システム ====================
function showHint() {
    const q = state.questions[state.currentIndex];
    const hintDisplay = document.getElementById('hint-display-area');
    
    if (state.hintCount >= q.hints.length) return;
    
    hintDisplay.classList.add('active');
    
    let currentHintHtml = '';
    
    // これまでに開いたヒントをすべて並べて表示する
    for (let i = 0; i <= state.hintCount; i++) {
        const hintText = q.hints[i];
        
        // 警告付きのヒントかチェックする (最後から2番目の要素、かつ警告文を含む場合)
        if (hintText.includes('⚠️')) {
            currentHintHtml += `<div class="hint-warning">${hintText}</div>`;
        } else {
            currentHintHtml += `<div class="hint-item"><span class="hint-num">ヒント${i + 1}:</span> ${hintText}</div>`;
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
        document.getElementById('answer-input').disabled = true;
        
        document.getElementById('btn-check').classList.add('hidden');
        document.getElementById('btn-next').classList.remove('hidden');
        document.getElementById('btn-hint').classList.add('hidden');
        
        // 誤答レコードとして追加
        const record = {
            questionText: q.text,
            userAnswer: 'ギブアップ（答えを確認）',
            correctAnswer: `\\(${q.correctAnswers[0].replace('y=', 'y = ')}\\)`,
            isCorrect: false
        };
        state.answers.push(record);
        
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

function quitDrill() {
    if (confirm('ドリルを中断してホームに戻りますか？そこまでの記録は保存されません。')) {
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
        
        const statusText = ans.isCorrect ? '正解' : 'まちがい';
        const statusClass = ans.isCorrect ? 'correct' : 'wrong';
        
        // ユーザー解答のスタイル調整
        const userAnsClass = ans.isCorrect ? 'correct' : 'user-wrong';
        
        item.innerHTML = `
            <div class="review-item-header">
                <span class="review-item-num">第 ${index + 1} 問</span>
                <span class="review-item-status ${statusClass}">${statusText}</span>
            </div>
            <div class="review-item-text">${ans.questionText}</div>
            <div class="review-item-answers">
                <div>あなたの解答: <span class="review-ans ${userAnsClass}">${ans.userAnswer}</span></div>
                ${!ans.isCorrect ? `<div>正しい答え: <span class="review-ans correct">${ans.correctAnswer}</span></div>` : ''}
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
