/**
 * 1次関数の立式マスター 問題データ生成プログラム (questions.js)
 * 
 * 7つの文章題テンプレートをベースに、数値をランダムに生成して問題を動的作成します。
 * ES ModulesのCORS制限（ローカルファイルを直接開いたときのエラー）を避けるため、
 * グローバル変数 `window.QuestionGenerator` に公開する形式をとっています。
 */

(function() {
    // ヘルパー関数: 指定した範囲の整数からランダムに1つ選ぶ
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // ヘルパー関数: 配列からランダムに1つ選ぶ
    function getRandomElement(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // 1次関数の立式問題テンプレート定義
    const templates = [
        {
            // 1. 水そうへの注水問題（増加）
            id: 'water_tank',
            generate: function() {
                const b = getRandomInt(2, 10); // 初期の深さ (2〜10cm)
                const a = getRandomElement([2, 3, 4, 5, 0.5, 1.5]); // 毎分の増加量 (cm)
                
                return {
                    id: `water_tank_${b}_${a.toString().replace('.', '_')}`,
                    text: `円柱の形をした水そうに、深さ \\(${b}\\text{cm}\\) のところまで水が入っています。この水そうに、1分間に深さが \\(${a}\\text{cm}\\) ずつ増加するように水を入れます。水を入れ始めてから \\(x\\) 分後の水の深さを \\(y\\text{cm}\\) とするとき、\\(y\\) を \\(x\\) の式で表しなさい。`,
                    correctAnswers: [
                        `y=${a}x+${b}`,
                        `y=${b}+${a}x`
                    ],
                    hints: [
                        `水を入れ始める前の、最初の水の深さは何cmかな？それが \\(y = ax + b\\) の \\(b\\)（切片）にあたります。`,
                        `1分間に何cmずつ増えているかな？それが \\(x\\) の前につく \\(a\\)（変化の割合）になります。`,
                        `⚠️ 注意：次のヒントは「答え」だよ！次を見ると不正解になっちゃうから気をつけてね！`,
                        `答えは \\(y = ${a}x + ${b}\\) （または \\(y = ${b} + ${a}x\\)）になります。`
                    ],
                    explanation: `
                        <p class="exp-title">【解説】</p>
                        <p>最初の水の深さは <strong>\\(${b}\\text{cm}\\)</strong> です。</p>
                        <p>1分間に <strong>\\(${a}\\text{cm}\\)</strong> ずつ深さが増えるので、\\(x\\) 分間に増える深さは <strong>\\(${a}x\\text{cm}\\)</strong> となります。</p>
                        <p>したがって、\\(x\\) 分後の全体の深さ \\(y\\text{cm}\\) は、最初の深さに増えた分を足して、</p>
                        <div class="exp-formula">\\(y = ${a}x + ${b}\\)</div>
                        <p>または項を入れ替えて</p>
                        <div class="exp-formula">\\(y = ${b} + ${a}x\\)</div>
                        <p>となります。</p>
                    `
                };
            }
        },
        {
            // 2. 線香の燃焼（減少・小数あり）
            id: 'incense',
            generate: function() {
                const b = getRandomInt(12, 24); // 初期の長さ (12〜24cm)
                const a = getRandomElement([0.5, 0.6, 0.8, 1.2, 1.5, 2]); // 毎分の減少量 (cm)
                
                return {
                    id: `incense_${b}_${a.toString().replace('.', '_')}`,
                    text: `長さ \\(${b}\\text{cm}\\) の線香に火をつけると、1分間に \\(${a}\\text{cm}\\) ずつ短くなりました。火をつけてから \\(x\\) 分後の線香の長さを \\(y\\text{cm}\\) とするとき、\\(y\\) を \\(x\\) の式で表しなさい。`,
                    correctAnswers: [
                        `y=-${a}x+${b}`,
                        `y=${b}-${a}x`
                    ],
                    hints: [
                        `火をつける前の、線香の最初の長さは何cmかな？それが \\(y = ax + b\\) の \\(b\\)（切片）にあたります。`,
                        `1分間に何cmずつ短くなっているかな？短くなる（減る）ので、変化の割合 \\(a\\) はマイナス（負の数）になります。`,
                        `⚠️ 注意：次のヒントは「答え」だよ！次を見ると不正解になっちゃうから気をつけてね！`,
                        `答えは \\(y = -${a}x + ${b}\\) （または \\(y = ${b} - ${a}x\\)）になります。`
                    ],
                    explanation: `
                        <p class="exp-title">【解説】</p>
                        <p>最初の線香の長さは <strong>\\(${b}\\text{cm}\\)</strong> です。</p>
                        <p>1分間に <strong>\\(${a}\\text{cm}\\)</strong> ずつ短くなる（減る）ので、\\(x\\) 分間で短くなる長さは <strong>\\(${a}x\\text{cm}\\)</strong> となります。</p>
                        <p>したがって、\\(x\\) 分後の線香の長さ \\(y\\text{cm}\\) は、最初の長さから減った分を引いて、</p>
                        <div class="exp-formula">\\(y = ${b} - ${a}x\\)</div>
                        <p>または \\(x\\) の項を前に書いて</p>
                        <div class="exp-formula">\\(y = -${a}x + ${b}\\)</div>
                        <p>となります。</p>
                    `
                };
            }
        },
        {
            // 3. 針金の残りの重さ（減少・大きな数）
            id: 'wire_weight',
            generate: function() {
                const b = getRandomElement([500, 800, 1000, 1200]); // 全体の重さ (g)
                const a = getRandomElement([15, 20, 25, 30, 40]); // 1mあたりの重さ (g)
                
                return {
                    id: `wire_${b}_${a}`,
                    text: `1mあたりの重さが \\(${a}\\text{g}\\) の針金が、全部で \\(${b}\\text{g}\\) あります。この針金を \\(x\\text{m}\\) 使ったとき、残りの針金の重さを \\(y\\text{g}\\) とするとき、\\(y\\) を \\(x\\) の式で表しなさい。`,
                    correctAnswers: [
                        `y=-${a}x+${b}`,
                        `y=${b}-${a}x`
                    ],
                    hints: [
                        `使う前の、針金の最初の全体の重さは何gかな？それが \\(y = ax + b\\) の \\(b\\)（切片）にあたります。`,
                        `針金を1m使うごとに重さは何gずつ減っていくかな？減るのでマイナスの変化になります。`,
                        `⚠️ 注意：次のヒントは「答え」だよ！次を見ると不正解になっちゃうから気をつけてね！`,
                        `答えは \\(y = -${a}x + ${b}\\) （または \\(y = ${b} - ${a}x\\)）になります。`
                    ],
                    explanation: `
                        <p class="exp-title">【解説】</p>
                        <p>最初の全体の重さは <strong>\\(${b}\\text{g}\\)</strong> です。</p>
                        <p>1mあたり <strong>\\(${a}\\text{g}\\)</strong> で、\\(x\\text{m}\\) 使うので、使った針金の重さは <strong>\\(${a}x\\text{g}\\)</strong> です。</p>
                        <p>したがって、残りの重さ \\(y\\text{g}\\) は、最初の重さから使った分を引いて、</p>
                        <div class="exp-formula">\\(y = ${b} - ${a}x\\)</div>
                        <p>または</p>
                        <div class="exp-formula">\\(y = -${a}x + ${b}\\)</div>
                        <p>となります。</p>
                    `
                };
            }
        },
        {
            // 4. 学校までの残りの道のり（減少・速さ）
            id: 'distance',
            generate: function() {
                const b = getRandomElement([1200, 1500, 1800, 2000, 2400]); // 全体の道のり (m)
                const a = getRandomElement([60, 70, 80, 90]); // 分速 (m/分)
                
                return {
                    id: `distance_${b}_${a}`,
                    text: `家から \\(${b}\\text{m}\\) 離れた学校に向かって、分速 \\(${a}\\text{m}\\) で歩き始めました。歩き始めてから \\(x\\) 分後の学校までの残りの道のりを \\(y\\text{m}\\) とするとき、\\(y\\) を \\(x\\) の式で表しなさい。`,
                    correctAnswers: [
                        `y=-${a}x+${b}`,
                        `y=${b}-${a}x`
                    ],
                    hints: [
                        `歩き始める前の、学校までの最初の道のりは何mかな？それが \\(y = ax + b\\) の \\(b\\)（切片）にあたります。`,
                        `1分間に何mずつ進むかな？進んだ分だけ、学校までの「残りの道のり」は減っていくよ。`,
                        `⚠️ 注意：次のヒントは「答え」だよ！次を見ると不正解になっちゃうから気をつけてね！`,
                        `答えは \\(y = -${a}x + ${b}\\) （または \\(y = ${b} - ${a}x\\)）になります。`
                    ],
                    explanation: `
                        <p class="exp-title">【解説】</p>
                        <p>全体の道のりは <strong>\\(${b}\\text{m}\\)</strong> です。</p>
                        <p>分速 <strong>\\(${a}\\text{m}\\)</strong> で \\(x\\) 分間歩くと、進んだ道のりは <strong>\\(${a}x\\text{m}\\)</strong> となります。</p>
                        <p>求めるのは「学校までの残りの道のり」なので、全体の道のりから歩いた分を引いて、</p>
                        <div class="exp-formula">\\(y = ${b} - ${a}x\\)</div>
                        <p>または</p>
                        <div class="exp-formula">\\(y = -${a}x + ${b}\\)</div>
                        <p>となります。</p>
                    `
                };
            }
        },
        {
            // 5. お買い物と残金（減少・お金）
            id: 'shopping',
            generate: function() {
                const b = getRandomElement([1000, 2000, 3000, 5000]); // 所持金 (円)
                const a = getRandomElement([120, 150, 180, 200, 250]); // りんごの単価 (円)
                
                return {
                    id: `shopping_${b}_${a}`,
                    text: `\\(${b}\\text{円}\\) 持って買い物に行き、1個 \\(${a}\\text{円}\\) のりんごを \\(x\\) 個買いました。そのときの残金を \\(y\\text{円}\\) とするとき、\\(y\\) を \\(x\\) の式で表しなさい。`,
                    correctAnswers: [
                        `y=-${a}x+${b}`,
                        `y=${b}-${a}x`
                    ],
                    hints: [
                        `買い物をする前の、最初の所持金は何円かな？それが \\(y = ax + b\\) の \\(b\\)（切片）にあたります。`,
                        `りんごを1個買うごとに、手持ちのお金は何円ずつ減っていくかな？`,
                        `⚠️ 注意：次のヒントは「答え」だよ！次を見ると不正解になっちゃうから気をつけてね！`,
                        `答えは \\(y = -${a}x + ${b}\\) （または \\(y = ${b} - ${a}x\\)）になります。`
                    ],
                    explanation: `
                        <p class="exp-title">【解説】</p>
                        <p>最初の所持金は <strong>\\(${b}\\text{円}\\)</strong> です。</p>
                        <p>1個 <strong>\\(${a}\\text{円}\\)</strong> のりんごを <strong>\\(x\\) 個</strong> 買ったので、りんごの代金の合計は <strong>\\(${a}x\\text{円}\\)</strong> となります。</p>
                        <p>したがって、残金 \\(y\\text{円}\\) は、所持金から代金を引いて、</p>
                        <div class="exp-formula">\\(y = ${b} - ${a}x\\)</div>
                        <p>または</p>
                        <div class="exp-formula">\\(y = -${a}x + ${b}\\)</div>
                        <p>となります。</p>
                    `
                };
            }
        },
        {
            // 6. 毎月の貯金（増加・お金）
            id: 'saving',
            generate: function() {
                const b = getRandomElement([2000, 3000, 5000, 8000]); // 初期の貯金 (円)
                const a = getRandomElement([500, 800, 1000, 1500]); // 毎月の貯金額 (円)
                
                return {
                    id: `saving_${b}_${a}`,
                    text: `現在 \\(${b}\\text{円}\\) の貯金があります。来月から毎月 \\(${a}\\text{円}\\) ずつ貯金していくとき、\\(x\\) ヶ月後の貯金総額を \\(y\\text{円}\\) とするとき、\\(y\\) を \\(x\\) の式で表しなさい。`,
                    correctAnswers: [
                        `y=${a}x+${b}`,
                        `y=${b}+${a}x`
                    ],
                    hints: [
                        `貯金を始める前の、現在の貯金額は何円かな？それが \\(y = ax + b\\) の \\(b\\)（切片）にあたります。`,
                        `1ヶ月ごとに貯金は何円ずつ増えていくかな？それが \\(x\\) の前につく \\(a\\)（変化の割合）になります。`,
                        `⚠️ 注意：次のヒントは「答え」だよ！次を見ると不正解になっちゃうから気をつけてね！`,
                        `答えは \\(y = ${a}x + ${b}\\) （または \\(y = ${b} + ${a}x\\)）になります。`
                    ],
                    explanation: `
                        <p class="exp-title">【解説】</p>
                        <p>現在の貯金額は <strong>\\(${b}\\text{円}\\)</strong> です。</p>
                        <p>毎月 <strong>\\(${a}\\text{円}\\)</strong> ずつ新しく貯金するので、\\(x\\) ヶ月間に貯まる金額は <strong>\\(${a}x\\text{円}\\)</strong> となります。</p>
                        <p>したがって、\\(x\\) ヶ月後の貯金総額 \\(y\\text{円}\\) は、現在の貯金に新しく貯まった分を足して、</p>
                        <div class="exp-formula">\\(y = ${a}x + ${b}\\)</div>
                        <p>または</p>
                        <div class="exp-formula">\\(y = ${b} + ${a}x\\)</div>
                        <p>となります。</p>
                    `
                };
            }
        },
        {
            // 7. 標高と気温（減少・負の数）
            id: 'temperature',
            generate: function() {
                const b = getRandomInt(15, 28); // 地上の気温 (15〜28度)
                const a = 6; // 標高1kmごとの気温低下 (通常6度)
                
                return {
                    id: `temp_${b}_${a}`,
                    text: `地上（標高 \\(0\\text{km}\\)）の気温が \\(${b}\\text{℃}\\) のとき、上空へ標高が \\(1\\text{km}\\) 上がるごとに気温が \\(${a}\\text{℃}\\) ずつ下がります。標高 \\(x\\text{km}\\) のときの気温を \\(y\\text{℃}\\) とするとき、\\(y\\) を \\(x\\) の式で表しなさい。`,
                    correctAnswers: [
                        `y=-${a}x+${b}`,
                        `y=${b}-${a}x`
                    ],
                    hints: [
                        `地上の気温（標高0kmのとき）は何度かな？それが \\(y = ax + b\\) の \\(b\\)（切片）にあたります。`,
                        `標高が1km上がるごとに気温は何度ずつ下がる（減る）かな？下がるので、変化の割合はマイナスになります。`,
                        `⚠️ 注意：次のヒントは「答え」だよ！次を見ると不正解になっちゃうから気をつけてね！`,
                        `答えは \\(y = -${a}x + ${b}\\) （または \\(y = ${b} - ${a}x\\)）になります。`
                    ],
                    explanation: `
                        <p class="exp-title">【解説】</p>
                        <p>地上（標高0km）の気温は <strong>\\(${b}\\text{℃}\\)</strong> です。</p>
                        <p>標高が \\(1\\text{km}\\) 上がるごとに <strong>\\(${a}\\text{℃}\\)</strong> ずつ下がるので、標高 \\(x\\text{km}\\) では気温が <strong>\\(${a}x\\text{℃}\\)</strong> 下がります。</p>
                        <p>したがって、標高 \\(x\\text{km}\\) のときの気温 \\(y\\text{℃}\\) は、地上の気温から下がった分を引いて、</p>
                        <div class="exp-formula">\\(y = ${b} - ${a}x\\)</div>
                        <p>または</p>
                        <div class="exp-formula">\\(y = -${a}x + ${b}\\)</div>
                        <p>となります。</p>
                    `
                };
            }
        }
    ];

    // グローバルオブジェクトに問題生成ロジックを公開する
    window.QuestionGenerator = {
        /**
         * 7つのテンプレートからランダムに指定された問題数の問題を生成します。
         * 同じテンプレートが重複しないように抽出します（5問生成するため、7つの中から5つを一意に選ぶ）。
         * 
         * @param {number} count 生成する問題数 (通常5問)
         * @returns {Array} 生成された問題オブジェクトの配列
         */
        generateQuestions: function(count = 5) {
            // テンプレートをシャッフル（ランダムな順序にする）
            const shuffledTemplates = [...templates].sort(() => Math.random() - 0.5);
            
            // 必要な問題数分（最大7）だけ選んで、それぞれ数値をランダム生成する
            const selectedTemplates = shuffledTemplates.slice(0, Math.min(count, templates.length));
            
            return selectedTemplates.map(template => template.generate());
        }
    };
})();
