
let selected = null;
let usedCards = new Set();

function selectCard(el) {
  selected = el;
  document.getElementById("card-popup").style.display = "block";
  renderPopup();
}

function closePopup() {
  document.getElementById("card-popup").style.display = "none";
}

function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(div => div.style.display = 'none');
  document.getElementById(tabId).style.display = 'flex';
}

function updateUsedCards() {
  usedCards.clear();
  const allIds = ['b1','b2','b3','b4'];
  for (let i = 1; i <= 9; i++) {
    allIds.push(`p${i}c1`);
    allIds.push(`p${i}c2`);
  }
  allIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && el !== selected) {
      const code = el.getAttribute("data-code");
      if (code) usedCards.add(code);
    }
  });
}

function renderPopup() {
  updateUsedCards();
  const suits = { c: 'clubs', d: 'diamonds', h: 'hearts', s: 'spades' };
  const ranks = ['2','3','4','5','6','7','8','9','t','j','q','k','a'];
  for (let [suitCode, tabId] of Object.entries(suits)) {
    const container = document.getElementById(tabId);
    if (!container) continue;
    container.innerHTML = '';
    ranks.forEach(rank => {
      const code = rank + suitCode;
      if (usedCards.has(code)) return;
      const img = document.createElement("img");
      img.src = `https://raw.githubusercontent.com/UTD888/luxu-insurance/main/cardsset/${code}.png`;
      img.onclick = () => {
        const previous = selected.getAttribute("data-code");
        if (previous) usedCards.delete(previous);
        selected.setAttribute("data-code", code);
        selected.style.backgroundImage = `url('https://raw.githubusercontent.com/UTD888/luxu-insurance/main/cardsset/${code}.png')`;
        localStorage.setItem(selected.id, code);
        usedCards.add(code);
        closePopup();
        calculateOuts();
      };
      container.appendChild(img);
    });
  }
}

function restoreSelectedCards() {
  const allIds = ['b1','b2','b3','b4'];
  for (let i = 1; i <= 9; i++) {
    allIds.push(`p${i}c1`);
    allIds.push(`p${i}c2`);
  }

  allIds.forEach(id => {
    const code = localStorage.getItem(id);
    const el = document.getElementById(id);
    if (code && el) {
      el.setAttribute("data-code", code);
      el.style.backgroundImage = `url('https://raw.githubusercontent.com/UTD888/luxu-insurance/main/cardsset/${code}.png')`;
    }
  });

  for (let i = 1; i <= 9; i++) {
    const c1 = localStorage.getItem(`p${i}c1`);
    const c2 = localStorage.getItem(`p${i}c2`);
    if (c1 || c2) {
      const container = document.getElementById(`p${i}-container`);
      if (container) container.style.display = 'flex';
    }
  }
}

function getCardCode(id) {
  const el = document.getElementById(id);
  return el ? el.getAttribute("data-code") : null;
}

function getAllCards() {
  const suits = ['c','d','h','s'];
  const ranks = ['2','3','4','5','6','7','8','9','t','j','q','k','a'];
  return ranks.flatMap(r => suits.map(s => r + s));
}

function evaluateHand(cards7) {
  const rankOrder = '23456789tjqka';
  const rv = r => rankOrder.indexOf(r);
  const comb = (arr, k) => k === 0 ? [[]] : arr.length < k ? [] :
    comb(arr.slice(1), k - 1).map(c => [arr[0], ...c]).concat(comb(arr.slice(1), k));
  const best5 = comb(cards7, 5);
  function score(hand) {
    const count = {}, suit = {}, vals = hand.map(c => rv(c[0]));
    hand.forEach(c => {
      count[c[0]] = (count[c[0]] || 0) + 1;
      suit[c[1]] = (suit[c[1]] || []).concat(c);
    });
    const entries = Object.entries(count).sort((a, b) => b[1] - a[1] || rv(b[0]) - rv(a[0]));
    const uniq = [...new Set(vals)].sort((a, b) => b - a);
    if (uniq.includes(12)) uniq.push(-1);
    const flushSuit = Object.entries(suit).find(([_, cards]) => cards.length >= 5);
    if (flushSuit) {
      const flushCards = flushSuit[1].slice().sort((a, b) => rv(b[0]) - rv(a[0]));
      const fvals = flushCards.map(c => rv(c[0]));
      const flushUniq = [...new Set(fvals)];
      if (flushUniq.includes(12)) flushUniq.push(-1);
      for (let i = 0; i <= flushUniq.length - 5; i++) {
        if (flushUniq[i] - flushUniq[i + 4] === 4) return { rank: flushUniq[i] === 12 ? 9 : 8, kickers: [flushUniq[i]] };
      }
      return { rank: 5, kickers: fvals.slice(0, 5) };
    }
    for (let i = 0; i <= uniq.length - 5; i++) {
      if (uniq[i] - uniq[i + 4] === 4) return { rank: 4, kickers: [uniq[i]] };
    }
    if (entries[0][1] === 4) return { rank: 7, kickers: [rv(entries[0][0]), ...vals.filter(v => v !== rv(entries[0][0])).slice(0, 1)] };
    if (entries[0][1] === 3 && entries[1] && entries[1][1] >= 2) return { rank: 6, kickers: [rv(entries[0][0]), rv(entries[1][0])] };
    if (entries[0][1] === 3) return { rank: 3, kickers: [rv(entries[0][0]), ...vals.filter(v => v !== rv(entries[0][0])).slice(0, 2)] };
    if (entries[0][1] === 2 && entries[1] && entries[1][1] === 2) return { rank: 2, kickers: [rv(entries[0][0]), rv(entries[1][0]), ...vals.filter(v => v !== rv(entries[0][0]) && v !== rv(entries[1][0])).slice(0, 1)] };
    if (entries[0][1] === 2) return { rank: 1, kickers: [rv(entries[0][0]), ...vals.filter(v => v !== rv(entries[0][0])).slice(0, 3)] };
    return { rank: 0, kickers: vals.sort((a, b) => b - a).slice(0, 5) };
  }
  return best5.map(score).reduce((a, b) => compareHands(b, a) > 0 ? b : a);
}

function compareHands(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.max(a.kickers.length, b.kickers.length); i++) {
    const va = a.kickers[i] || -1;
    const vb = b.kickers[i] || -1;
    if (va !== vb) return va - vb;
  }
  return 0;
}

function togglePlayer(id) {
  const el = document.getElementById(id);
  const btn = document.querySelector(`button[onclick="togglePlayer('${id}')"]`);
  if (el) {
    const visible = el.style.display !== "none";
    el.style.display = visible ? "none" : "flex";
    if (btn) btn.textContent = id.replace("-container", "").toUpperCase() + (visible ? "✅" : "❌");
  }
}

function resetAll() {
  const ids = ['b1','b2','b3','b4'];
  for (let i = 1; i <= 9; i++) {
    ids.push(`p${i}c1`);
    ids.push(`p${i}c2`);
    localStorage.removeItem(`p${i}c1`);
    localStorage.removeItem(`p${i}c2`);
    const el = document.getElementById(`p${i}-outs`);
    if (el) el.innerHTML = "";
  }
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.removeAttribute("data-code");
      el.style.backgroundImage = "url('https://raw.githubusercontent.com/UTD888/luxu-insurance/main/luxulogo.png')";
      localStorage.removeItem(id);
    }
  });
  const box = document.getElementById("detailed-outs-box");
  if (box) box.innerHTML = "";
}

function toggleDetails() {
  const box = document.getElementById("detailed-outs-box");
  const btn = document.querySelector("button[onclick='toggleDetails()']");
  if (!box) return;
  const visible = box.style.display === "block";
  box.style.display = visible ? "none" : "block";
  if (btn) btn.textContent = visible ? "Show Details" : "Hide Details";
}


function calculateOuts() {
  const handNames = ["High Card", "One Pair", "Two Pair", "Three of a Kind", "Straight", "Flush", "Full House", "Four of a Kind", "Straight Flush", "Royal Flush"];
  const board = ['b1','b2','b3','b4'].map(getCardCode).filter(Boolean);
  if (board.length < 3) return;

  const players = [];
  for (let i = 1; i <= 9; i++) {
    const c1 = getCardCode(`p${i}c1`);
    const c2 = getCardCode(`p${i}c2`);
    if (c1 && c2) {
      players.push({ id: `p${i}`, cards: [c1, c2] });
    }
  }
  if (players.length < 2) return;

  const used = [...board, ...players.flatMap(p => p.cards)];
  const deck = getAllCards().filter(c => !used.includes(c));

  const base = Object.fromEntries(players.map(p => [p.id, evaluateHand([...p.cards, ...board])]));
  const best = Object.entries(base).sort((a, b) => compareHands(b[1], a[1]))[0];
  const behinds = Object.entries(base).filter(([id, hand]) => compareHands(hand, best[1]) < 0);

  const outs = {};
  for (let c of deck) {
    const newBoard = [...board, c];
    const newHands = Object.fromEntries(players.map(p => [p.id, evaluateHand([...p.cards, ...newBoard])]));
    for (let [id, oldHand] of behinds) {
      const newHand = newHands[id];
      if (compareHands(newHand, newHands[best[0]]) > 0) {
        if (!outs[id]) outs[id] = [];
        outs[id].push({ card: c, rank: newHand.rank });
      }
    }
  }

  const rateMap = {1: 30, 2: 15, 3: 10, 4: 8, 5: 6, 6: 5, 7: 4, 8: 3.5, 9: 3, 10: 2.5, 11: 2, 12: 1.5};

  for (let i = 1; i <= 9; i++) {
    const el = document.getElementById(`p${i}-outs`);
    if (el) el.innerHTML = "";
  }

  // 🟥 MONTE CARLO SIMULATION
  const simulations = 2000;
  const winCount = {};
  const tieCount = {};
  players.forEach(p => {
    winCount[p.id] = 0;
    tieCount[p.id] = 0;
  });

  for (let i = 0; i < simulations; i++) {
    const remaining = getAllCards().filter(c => !used.includes(c));
    const shuffled = [...remaining].sort(() => 0.5 - Math.random());
    const extra = shuffled.slice(0, 5 - board.length);
    const fullBoard = [...board, ...extra];

    const results = players.map(p => ({
      id: p.id,
      hand: evaluateHand([...p.cards, ...fullBoard])
    }));

    results.sort((a, b) => compareHands(b.hand, a.hand));
    const bestHand = results[0].hand;
    const winners = results.filter(r => compareHands(r.hand, bestHand) === 0);

    if (winners.length === 1) {
      winCount[winners[0].id]++;
    } else {
      winners.forEach(w => tieCount[w.id]++);
    }
  }

  // 🟦 ใส่ข้อมูลลงกล่อง
  Object.entries(outs).forEach(([pid, list]) => {
    const total = list.length;
    const rate = rateMap[total] !== undefined ? rateMap[total] + "x" : "?x";
    const el = document.getElementById(pid + "-outs");
    if (el) {
      const winPercent = ((winCount[pid] / simulations) * 100).toFixed(1);
      let txt = pid === best[0] ? "Leader<br>" : "";
      txt += `<strong>${total} Outs</strong><br><strong>Rate:</strong> ${rate}<br><strong>Win %:</strong> ${winPercent}%`;
      el.innerHTML = txt;
    }
  });

  const leaderBox = document.getElementById(`${best[0]}-outs`);
  if (leaderBox) {
    const leaderWin = ((winCount[best[0]] / simulations) * 100).toFixed(1);
    leaderBox.innerHTML = `<div style="color:red; font-weight:bold;">Leader</div><br><strong>Win %:</strong> ${leaderWin}%`;
  }

  // 🟨 รายละเอียดกล่องล่าง
  const detailBox = document.getElementById("detailed-outs-box");
  if (detailBox) {
    let html = `<div><strong>Leader: ${best[0]} (${handNames[base[best[0]].rank]})</strong></div><br>`;
    const detailGrouped = {};
    Object.entries(outs).forEach(([pid, list]) => {
      detailGrouped[pid] = {};
      list.forEach(({ card, rank }) => {
        const type = handNames[rank];
        if (!detailGrouped[pid][type]) detailGrouped[pid][type] = [];
        detailGrouped[pid][type].push(card);
      });
    });

    for (let [pid, byType] of Object.entries(detailGrouped)) {
      const total = Object.values(byType).reduce((sum, arr) => sum + arr.length, 0);
      html += `<div><strong>${pid} has ${total} outs to beat ${best[0]}</strong></div>`;
      for (let [type, cards] of Object.entries(byType)) {
        const formatted = cards.map(c => {
          const rank = c[0].toUpperCase();
          const suitChar = {"c":"\u2663","d":"\u2666","h":"\u2665","s":"\u2660"}[c[1]];
          const color = (c[1] === "h" || c[1] === "d") ? "red" : "black";
          return `<span class='card ${color}'>${rank}${suitChar}</span>`;
        }).join(" ");
        html += `<div style="margin-left:20px;">- ${type} (${cards.length} outs): ${formatted}</div>`;
      }
      html += "<br>";
    }

    detailBox.innerHTML = html;
  }
}



window.addEventListener("load", () => {
  restoreSelectedCards();
  updateUsedCards();
});