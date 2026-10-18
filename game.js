// 魚を一匹作成
const sea = document.getElementById("sea");

// ゲーム画面にいる魚の情報を格納（毒の魚もここに入る）
const fishes = [];
let score = 0;
let fishing = false;
// ゲーム中かどうか（スタート前・終了後は false）
let playing = false;
// いま問題を出している魚
let currentFish = null;
// 問題を閉じた直後、糸が離れるまで釣らない魚
let ignoredFish = null;
// 毒の魚を釣ったかどうか（「次へ」を押したら毒になる）
let poisoned = false;

// レベルごとの問題データ
const FISH_BY_LEVEL = { 1: FISH, 2: FISH_Lv2, 3: FISH_Lv3 };

function randomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
}

// 魚を1匹消して、同じ種類（レベル・毒）の新しい魚を補充する
function replaceFish(fish) {
    fish.el.remove();
    fishes.splice(fishes.indexOf(fish), 1);
    if (fish.poison) {
        createpoisonFish();
    } else {
        createFish(randomItem(FISH_BY_LEVEL[fish.Lv]), fish.Lv);
    }
}

// 魚が泳ぐ高さを決める（海の中での位置）
// 一番上は、最初の糸の先（画面の上から150px）より下にする。何もしないのに釣れないように
function randomFishY(el) {
    const headerHeight = document.getElementById("header").offsetHeight;
    const top = Math.max(50, 180 - headerHeight);
    const range = window.innerHeight - headerHeight - el.offsetHeight - top - 30;
    return top + Math.random() * Math.max(range, 100);
}

// 魚の見た目と動きの情報を作る
// anywhere が true なら画面のどこかから、false なら左右どちらかの画面の外から泳いでくる
function makeFish(data, anywhere) {
    // ボタンだとマウスやTabキーで押せてしまうので、ただの div にする
    const el = document.createElement("div");
    el.className = "fish";
    el.textContent = data.k;
    sea.appendChild(el);
    const right = Math.random() < 0.5;
    let x;
    if (anywhere) {
        x = Math.random() * (window.innerWidth - el.offsetWidth);
    } else if (right) {
        x = (Math.random() * 300 + 300) * -1;
    } else {
        x = window.innerWidth + Math.random() * 300;
    }
    const fish = {
        el: el,
        data: data,
        x: x,
        y: randomFishY(el),
        speed: Math.random() * 1.5 + 1,
        right: right,
    };
    // 最初の位置にすぐ置く（左端に一瞬出ないように）
    el.style.left = fish.x + "px";
    el.style.top = fish.y + "px";
    fishes.push(fish);
    return fish;
}

// 魚作成
function createFish(data, Lv, anywhere = false) {
    const fish = makeFish(data, anywhere);
    fish.Lv = Lv;

    /** 糸に魚がかかったとき（マウスで押しても反応しない） */
    fish.onHook = () => {
        if (!playing) return;
        currentFish = fish;
        openModal(fish.data.k);

        // 前のクリックイベントを削除
        $("#btn").off("click");
        // 確定ボタンクリック
        $("#btn").on("click", function () {
            let element = document.getElementById('text');

            if (isCorrectAnswer(element.value, fish.data.r)) {
                $("#text").val("");
                score += Lv;
                $("#score").text(score);
                showResult("正解", "red", fish);
            } else {
                showResult("不正解", "blue", fish);
                $("#text").val("");
            }
            // 答えを見せたので、正解・不正解どちらでも魚を入れ替える
            replaceFish(fish);
            currentFish = null;
            resetLine();
        });

        $("#next").off("click").on("click", function () {
            $('#modal').modal('hide');
        });
    };
}


// 毒の魚を作成
function createpoisonFish(anywhere = false) {
    const po_fish = makeFish(randomItem(POISON_FISH), anywhere);
    po_fish.poison = true;

    /** 糸に魚がかかったとき（マウスで押しても反応しない） */
    po_fish.onHook = () => {
        if (!playing) return;
        currentFish = po_fish;
        openModal(po_fish.data.k);
        // 前のクリックイベントを削除
        $("#btn").off("click");
        // 確定ボタンクリック
        $("#btn").on("click", function () {
            $("#text").val("");
            showResult("毒をもっています", "purple", po_fish);
            poisoned = true;
            replaceFish(po_fish);
            currentFish = null;
            resetLine();
        });

        $("#next").off("click").on("click", function () {
            $('#modal').modal('hide');
        });
    };
}

// 毒：画面が揺れて、魚が3秒間紫になる
function poisonEffect() {
    const shake = document.getElementById('sea');
    shake.classList.add('shake');
    $(".fish").css("color", "purple");
    // 3秒後に停止
    setTimeout(() => {
        shake.classList.remove('shake');
        $(".fish").css("color", "");
    }, 3000);
}


function resetModal() {
    $("#text").show();
    $("#btn").show();
    $("#result").hide();
    $("#next").hide();
    $("#description").hide();
    $("#read").hide();
    $("#text").val("");
    $("#result").css("color", "");
}

function openModal(kanji) {
    fishing = true;
    resetModal();
    $("#kanji").text(kanji);
    $('#modal').modal('show');
}

function showResult(message, color, fish) {
    $("#text").hide();
    $("#btn").hide();
    $("#result")
        .text(message)
        .css("color", color)
        .show();
    $("#next").show();
    $("#read")
        .text(fish.data.r)
        .show();
    $("#description")
        .text(fish.data.d)
        .show();
}


function kanaToHira(str) {
    return str.replace(/[ァ-ヶ]/g, function (match) {
        var chr = match.charCodeAt(0) - 0x60;
        return String.fromCharCode(chr);
    });
}
function isCorrectAnswer(input, answer) {
    input = input.trim();
    return input === answer || kanaToHira(input) === answer;
}


// 魚の動きは端に行ったときに逆向きにいく（端は画面の幅に合わせる）
function moveFish(fish) {
    const rightEdge = window.innerWidth - fish.el.offsetWidth;
    if (fish.x >= rightEdge) {
        fish.right = false;
    }
    if (fish.x <= 0) {
        fish.right = true;
    }

    if (fish.right == true) {
        fish.x += fish.speed;
        fish.el.style.transform = 'scaleX(1)';
    } else {
        fish.x -= fish.speed;
        fish.el.style.transform = 'scaleX(-1)';
    }
    fish.el.style.left = fish.x + "px";
    fish.el.style.top = fish.y + "px";
}

function update() {
    // スタート前・終了後も魚は泳ぎ続ける
    for (let i = fishes.length - 1; i >= 0; i--) {
        moveFish(fishes[i]);
    }

    // 当たり判定
    if (playing && !fishing) {
        const lineRect = line.getBoundingClientRect();

        // 糸の先っちょ（下端の中心）
        const tipX = lineRect.left + lineRect.width / 2;
        const tipY = lineRect.bottom;

        for (let i = fishes.length - 1; i >= 0; i--) {
            const fish = fishes[i];
            const fishRect = fish.el.getBoundingClientRect();

            // 糸の先っちょが、魚の四角の中に入っているか
            const hit =
                tipX >= fishRect.left &&
                tipX <= fishRect.right &&
                tipY >= fishRect.top &&
                tipY <= fishRect.bottom;

            // さっき閉じた魚は、糸が一度離れるまで釣らない
            if (fish === ignoredFish) {
                if (!hit) ignoredFish = null;
                continue;
            }

            if (hit) {
                fish.onHook();
                break;
            }
        }
    }
    requestAnimationFrame(update);
}


// 魚を最初にセット
// レベルごとの数（ここを変えると魚の数が変わる）
const FISH_COUNT = { 1: 7, 2: 5, 3: 3 };
const POISON_COUNT = 3;
// スマホなど画面が狭いときは魚を減らす（幅1000px以上で全部、狭いほど少なく）
const FISH_SCALE = Math.min(1, Math.max(0.5, window.innerWidth / 1000));
function scaledCount(count) {
    return Math.max(1, Math.round(count * FISH_SCALE));
}
for (const Lv in FISH_COUNT) {
    for (let i = 0; i < scaledCount(FISH_COUNT[Lv]); i++) {
        createFish(randomItem(FISH_BY_LEVEL[Lv]), Number(Lv), true);
    }
}
for (let i = 0; i < scaledCount(POISON_COUNT); i++) {
    createpoisonFish(true);
}


// 最高記録の読み書き
// 保存できないブラウザ（プライベートモードなど）や、書き換えられた変な値でも壊れないようにする
function loadBestScore() {
    try {
        const value = parseInt(localStorage.getItem('key'), 10);
        return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch (e) {
        return 0;
    }
}
function saveBestScore(value) {
    try {
        localStorage.setItem('key', String(value));
    } catch (e) {
        // 保存できなくてもゲームは続ける
    }
}

// カウントダウンタイマー
let time = 30;
function countdownTimer() {
    $(".timer").text(time);
    if (time > 0) {
        time--;
        setTimeout(countdownTimer, 1000);
    } else {
        console.log("終了");
        playing = false;
        $('#modal').modal('hide');
        $("#resultScreen").css("display", "flex");
        $(".resultScore").text("スコア:" + score);
        const best = Math.max(loadBestScore(), score);
        saveBestScore(best);
        $(".bestScore").css("color", "#D4AF37");
        $(".bestScore").text("最高記録:" + best);
    }
}


// スタートボタンが押されたとき
$(".startButton").on("click", function () {
    $("#startScreen").hide();
    playing = true;
    // カウントダウンタイマーを開始
    countdownTimer();
});
// もう一度ボタンが押されたとき
$(".resultButton").on("click", function () {
    location.reload();
});


// 泡
const bubbles = [];
function createBubble() {
    const el = document.createElement("div");
    el.className = "bubble";
    sea.appendChild(el);
    const bubble = {
        el: el,
        x: Math.random() * window.innerWidth,
        y: window.innerHeight,
        speed: Math.random() * 2 + 1,
        size: Math.random() * 20 + 10,
    };
    el.style.width = bubble.size + "px";
    el.style.height = bubble.size + "px";
    bubbles.push(bubble);
}
function updateBubble() {
    for (let i = bubbles.length - 1; i >= 0; i--) {
        const bubble = bubbles[i];
        bubble.y -= bubble.speed;
        bubble.el.style.left = bubble.x + "px";
        bubble.el.style.top = bubble.y + "px";
        // 上まで行ったら削除
        if (bubble.y < 0) {
            bubble.el.remove();
            bubbles.splice(i, 1);
        }
    }
    requestAnimationFrame(updateBubble);
}
// 定期的に泡を生成
setInterval(createBubble, 600);
updateBubble();


// 糸の動き
// キーを押している間、毎フレーム少しずつ動かすので滑らかに動く
const line = document.getElementById('line');
const LINE_SPEED_X = 400; // 1秒あたりの横の移動量(px)
const LINE_SPEED_Y = 400; // 1秒あたりの縦の移動量(px)
let lineX = line.offsetLeft;
let lineHeight = line.offsetHeight;
// 最初の糸の長さ（答えたらここまで戻る）
const LINE_START_HEIGHT = lineHeight;

// 釣り糸を一瞬で上まで戻す
function resetLine() {
    lineHeight = LINE_START_HEIGHT;
    line.style.height = lineHeight + 'px';
}
const pressedKeys = {};
let lastTime = performance.now();

function moveLine(now) {
    // 前のフレームからの経過時間（秒）。タブを離れていたときの飛びを防ぐため上限をつける
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    // スタート前・終了後・問題に答えている間は糸を動かさない
    if (playing && !fishing) {
        if (pressedKeys.ArrowLeft) lineX -= LINE_SPEED_X * dt;
        if (pressedKeys.ArrowRight) lineX += LINE_SPEED_X * dt;
        if (pressedKeys.ArrowDown) lineHeight += LINE_SPEED_Y * dt;
        if (pressedKeys.ArrowUp) lineHeight -= LINE_SPEED_Y * dt;

        // スマホ：なぞっている指の方へ、糸の先を同じ速さで近づける
        if (touchTarget) {
            lineX += moveToward(lineX, touchTarget.x, LINE_SPEED_X * dt);
            lineHeight += moveToward(lineHeight, touchTarget.y, LINE_SPEED_Y * dt);
        }
    }

    // 糸が画面の外に出ないようにする
    lineX = Math.min(Math.max(lineX, 0), window.innerWidth);
    lineHeight = Math.min(Math.max(lineHeight, 0), window.innerHeight - 20);

    line.style.left = lineX + 'px';
    line.style.height = lineHeight + 'px';
    requestAnimationFrame(moveLine);
}
requestAnimationFrame(moveLine);

document.addEventListener('keydown', (event) => {
    if (event.key.startsWith('Arrow') && playing && !fishing) {
        pressedKeys[event.key] = true;
        event.preventDefault();
    }
});
document.addEventListener('keyup', (event) => {
    pressedKeys[event.key] = false;
});
// ウィンドウからフォーカスが外れたら押しっぱなし扱いを解除
window.addEventListener('blur', () => {
    for (const key in pressedKeys) pressedKeys[key] = false;
    touchTarget = null;
});

// from から to へ、最大 step だけ近づくための移動量
function moveToward(from, to, step) {
    const diff = to - from;
    return Math.abs(diff) <= step ? diff : Math.sign(diff) * step;
}

// スマホのタッチ操作（指でなぞる）。マウスでは反応しない
let touchTarget = null;
function onTouch(event) {
    if (event.pointerType !== 'touch' || !playing || fishing) return;
    touchTarget = { x: event.clientX, y: event.clientY };
}
document.addEventListener('pointerdown', onTouch);
document.addEventListener('pointermove', onTouch);
document.addEventListener('pointerup', () => { touchTarget = null; });
document.addEventListener('pointercancel', () => { touchTarget = null; });

update();


// Enterキーで「確定」「次へ」を押す
document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || !fishing) return;
    // 日本語入力の変換を確定するEnterは無視する
    if (event.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    if ($("#btn").is(":visible")) {
        $("#btn").click();
    } else if ($("#next").is(":visible")) {
        $("#next").click();
    }
});

// 問題が開いたら、すぐ入力できるようにする
$('#modal').on('shown.bs.modal', function () {
    $("#text").focus();
});

$('#modal').on('show.bs.modal', function () {
    // 問題が開いたら糸を止める
    for (const key in pressedKeys) pressedKeys[key] = false;
    touchTarget = null;
});

$('#modal').on('hidden.bs.modal', function () {
    // 答えずに閉じた魚は、糸が離れるまで再び釣れないようにする
    ignoredFish = currentFish;
    currentFish = null;
    fishing = false;
    resetModal();
    // 答えずに閉じたときも、釣り糸を上まで戻す
    resetLine();
    // 毒の魚を釣っていたら、ここで毒になる
    if (poisoned) {
        poisoned = false;
        poisonEffect();
    }
});
