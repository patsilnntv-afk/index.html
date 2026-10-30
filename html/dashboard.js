
import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  limit,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const ADMIN_UID = "ItHV6zFppeQQ4Kpukkyg3ynBiPZ2";
const ADMIN_PHONE = "2097192758";

let currentUser = null;
let memberData = {};
let memberDocId = null;
let unsubscribeMember = null;
let countdownTimer = null;
let countdown = 5;

const $ = id => document.getElementById(id);

const VIP_NAMES = {
  0: "VIP0",
  1: "VIP1",
  2: "VIP2",
  3: "VIP3",
  4: "VIP4"
};

function money(value) {
  return "$" + (Number(value) || 0).toFixed(2);
}

function showMessage(id, message) {
  const element = $(id);
  if (element) element.textContent = message;
}

function setButtonLoading(button, loading, normalText) {
  if (!button) return;

  button.disabled = loading;
  button.textContent = loading ? "ກຳລັງສົ່ງ..." : normalText;
}

// -------------------------
// FIND MEMBER DOCUMENT
// -------------------------

async function findMemberDocument(uid) {
  const directSnapshot = await getDoc(doc(db, "users", uid));

  if (directSnapshot.exists()) {
    return directSnapshot;
  }

  const memberQuery = query(
    collection(db, "users"),
    where("uid", "==", uid),
    limit(1)
  );

  const result = await getDocs(memberQuery);

  if (!result.empty) {
    return result.docs[0];
  }

  throw new Error("Member profile not found.");
}

// -------------------------
// PAGE NAVIGATION
// -------------------------

const pageTitles = {
  home: "Dashboard",
  balancePage: "Balance",
  depositPage: "Deposit Request",
  withdrawPage: "Withdraw Request",
  earningsPage: "Earnings",
  profitPage: "Profit Center",
  vipPage: "VIP Membership",
  historyPage: "History",
  accountPage: "My Account",
  contactPage: "Contact Admin"
};

function showPage(pageId) {
  document.querySelectorAll(".page-section").forEach(section => {
    section.classList.toggle("active", section.id === pageId);
  });

  document.querySelectorAll(".menu-item").forEach(button => {
    button.classList.toggle("active", button.dataset.page === pageId);
  });

  if ($("pageTitle")) {
    $("pageTitle").textContent = pageTitles[pageId] || "Dashboard";
  }

  if (pageId === "historyPage") {
    loadHistory();
  }
}

document.querySelectorAll(".menu-item[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

// -------------------------
// VIP DISPLAY
// -------------------------

function updateVIPDisplay(data) {
  const level = Math.max(
    0,
    Math.min(4, Number(data.vipLevel) || 0)
  );

  const vipName = VIP_NAMES[level];

  if ($("vipLevel")) $("vipLevel").textContent = vipName;
  if ($("accountVIP")) $("accountVIP").textContent = vipName;
  if ($("currentVIP")) $("currentVIP").textContent = vipName;
  if ($("vipCurrentLevel")) $("vipCurrentLevel").textContent = vipName;
  if ($("profitVIP")) $("profitVIP").textContent = vipName;

  if ($("nextVIPLevel")) {
    $("nextVIPLevel").textContent =
      level >= 4 ? "ສູງສຸດແລ້ວ" : VIP_NAMES[level + 1];
  }

  document.querySelectorAll("[data-vip-card]").forEach(card => {
    const cardLevel = Number(card.dataset.vipCard);
    card.classList.toggle("active", cardLevel === level);
  });

  if ($("vipRate")) {
    $("vipRate").textContent =
      data.vipRate !== undefined
        ? String(data.vipRate)
        : "ຍັງບໍ່ກຳນົດ";
  }

  if ($("vipRequirement")) {
    $("vipRequirement").textContent =
      level >= 4
        ? "ທ່ານຢູ່ລະດັບ VIP ສູງສຸດແລ້ວ"
        : "ລໍຖ້າ Admin ກຳນົດເງື່ອນໄຂ";
  }

  for (let i = 0; i <= 4; i++) {
    const rate = $("vipRate" + i);
    if (rate) rate.textContent = "ຍັງບໍ່ກຳນົດ";
  }

  for (let i = 1; i <= 4; i++) {
    const requirement = $("vipRequirement" + i);
    if (requirement) {
      requirement.textContent = "ຍັງບໍ່ກຳນົດ";
    }
  }

  if ($("vipMessage")) {
    $("vipMessage").textContent =
      "ລະດັບ VIP ປັດຈຸບັນ: " + vipName;
  }
}

// -------------------------
// UPDATE MEMBER INFORMATION
// -------------------------

function updateMemberDisplay(user, data) {
  memberData = data || {};

  const name = memberData.name || user.displayName || "Member";
  const email = memberData.email || user.email || "—";

  const balance = Number(memberData.demoBalance) || 0;
  const earnings = Number(memberData.totalEarnings) || 0;

  if ($("userEmail")) {
    $("userEmail").textContent = "Welcome: " + name;
  }

  if ($("balance")) {
    $("balance").textContent = money(balance);
  }

  if ($("balancePageAmount")) {
    $("balancePageAmount").textContent = money(balance);
  }

  if ($("totalEarnings")) {
    $("totalEarnings").textContent = money(earnings);
  }

  if ($("profitTotal")) {
    $("profitTotal").textContent = money(earnings);
  }

  if ($("accountName")) {
    $("accountName").textContent = name;
  }

  if ($("accountEmail")) {
    $("accountEmail").textContent = email;
  }

  if ($("accountUID")) {
    $("accountUID").textContent = user.uid;
  }

  if ($("adminLink")) {
    $("adminLink").hidden = user.uid !== ADMIN_UID;
  }

  updateVIPDisplay(memberData);
  updateEarningsDisplay(memberData);
}

// -------------------------
// REAL-TIME MEMBER LISTENER
// -------------------------

async function loadMemberData(user) {
  const memberDoc = await findMemberDocument(user.uid);

  memberDocId = memberDoc.id;

  updateMemberDisplay(user, memberDoc.data());

  if (unsubscribeMember) {
    unsubscribeMember();
  }

  unsubscribeMember = onSnapshot(
    doc(db, "users", memberDocId),
    snapshot => {
      if (!snapshot.exists()) {
        console.error("Member document no longer exists.");
        return;
      }

      updateMemberDisplay(user, snapshot.data());
    },
    error => {
      console.error("Member live update error:", error);
    }
  );

  await loadRequestCounts(user);
}

// -------------------------
// 5-SECOND STATUS COUNTDOWN
// -------------------------

function startStatusCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }

  countdown = 5;

  if ($("earningCountdown")) {
    $("earningCountdown").textContent = countdown + "s";
  }

  countdownTimer = setInterval(() => {
    countdown--;

    if ($("earningCountdown")) {
      $("earningCountdown").textContent = countdown + "s";
    }

    if (countdown <= 0) {
      countdown = 5;

      if ($("earningStatus")) {
        $("earningStatus").textContent =
          "ລະບົບພ້ອມຮັບການອັບເດດຈາກ Admin";
      }
    }
  }, 1000);
}

// -------------------------
// DATE FORMAT
// -------------------------

function formatDate(value) {
  if (!value) return "—";

  try {
    const date = value.toDate
      ? value.toDate()
      : new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString();
  } catch {
    return "—";
  }
}

// -------------------------
// EARNINGS DISPLAY
// -------------------------

function updateEarningsDisplay(data) {
  const total = Number(data.totalEarnings) || 0;

  if ($("totalEarnings")) {
    $("totalEarnings").textContent = money(total);
  }

  if ($("profitTotal")) {
    $("profitTotal").textContent = money(total);
  }

  if ($("earningRound1")) {
    $("earningRound1").textContent =
      data.earningRound1Status || "ລໍຖ້າການບັນທຶກ";
  }

  if ($("earningRound2")) {
    $("earningRound2").textContent =
      data.earningRound2Status || "ລໍຖ້າການບັນທຶກ";
  }

  if ($("earningStatus")) {
    $("earningStatus").textContent =
      "ລໍຖ້າການອັບເດດລາຍການຈາກ Admin";
  }

  const historyElement = $("earningHistory");
  if (!historyElement) return;

  const history = Array.isArray(data.earningsHistory)
    ? [...data.earningsHistory]
    : [];

  history.sort((a, b) => {
    const timeA = a.createdAt?.toMillis?.() || 0;
    const timeB = b.createdAt?.toMillis?.() || 0;
    return timeB - timeA;
  });

  historyElement.replaceChildren();

  if (history.length === 0) {
    historyElement.textContent = "ຍັງບໍ່ມີລາຍການກຳໄລ";
    return;
  }

  history.forEach(item => {
    const wrapper = document.createElement("div");
    wrapper.className = "history-item";

    const title = document.createElement("strong");
    title.textContent = "💰 Earnings - Round " +
      (Number(item.round) || "—");

    const amount = document.createElement("p");
    amount.textContent = "Amount: " + money(item.amount);

    const date = document.createElement("small");
    date.textContent = "Date: " + formatDate(item.createdAt);

    wrapper.append(title, amount, date);
    historyElement.appendChild(wrapper);
  });
}

// -------------------------
// REQUEST COUNTS
// -------------------------

async function loadRequestCounts(user) {
  try {
    const depositQuery = query(
      collection(db, "depositRequests"),
      where("uid", "==", user.uid)
    );

    const withdrawQuery = query(
      collection(db, "withdrawalRequests"),
      where("uid", "==", user.uid)
    );

    const [deposits, withdrawals] = await Promise.all([
      getDocs(depositQuery),
      getDocs(withdrawQuery)
    ]);

    if ($("depositCount")) {
      $("depositCount").textContent = deposits.size;
    }

    if ($("withdrawCount")) {
      $("withdrawCount").textContent = withdrawals.size;
    }

  } catch (error) {
    console.error("Request count error:", error);
  }
}

// -------------------------
// DEPOSIT REQUEST
// -------------------------

if ($("depositForm")) {
  $("depositForm").addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentUser) return;

    const amount = Number($("depositAmount").value);
    const method = $("depositMethod").value;
    const account = $("depositReference").value.trim();
    const button = $("depositSubmit");

    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
      showMessage("depositMessage", "ຈຳນວນເງິນບໍ່ຖືກຕ້ອງ.");
      return;
    }

    if (!method || account.length < 4 || account.length > 120) {
      showMessage("depositMessage", "ກະລຸນາກວດສອບຂໍ້ມູນ.");
      return;
    }

    setButtonLoading(button, true, "ສົ່ງຄຳຮ້ອງ");

    try {
      await addDoc(collection(db, "depositRequests"), {
        uid: currentUser.uid,
        amount,
        method,
        account,
        status: "pending",
        createdAt: serverTimestamp()
      });

      $("depositForm").reset();

      showMessage(
        "depositMessage",
        "ບັນທຶກຄຳຮ້ອງແລ້ວ. ລໍຖ້າ Admin ກວດສອບ."
      );

      await loadRequestCounts(currentUser);

    } catch (error) {
      console.error("Deposit request error:", error);

      showMessage(
        "depositMessage",
        "ສົ່ງຄຳຮ້ອງບໍ່ສຳເລັດ. ກວດສອບ Firebase Rules."
      );
    } finally {
      setButtonLoading(button, false, "ສົ່ງຄຳຮ້ອງ");
    }
  });
}

// -------------------------
// WITHDRAWAL REQUEST
// -------------------------

if ($("withdrawForm")) {
  $("withdrawForm").addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentUser) return;

    const amount = Number($("withdrawAmount").value);
    const method = $("withdrawMethod").value;
    const account = $("withdrawAccount").value.trim();
    const button = $("withdrawSubmit");

    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
      showMessage("withdrawMessage", "ຈຳນວນເງິນບໍ່ຖືກຕ້ອງ.");
      return;
    }

    if (!method || account.length < 4 || account.length > 120) {
      showMessage("withdrawMessage", "ກະລຸນາກວດສອບຂໍ້ມູນ.");
      return;
    }

    setButtonLoading(button, true, "ສົ່ງຄຳຮ້ອງ");

    try {
      await addDoc(collection(db, "withdrawalRequests"), {
        uid: currentUser.uid,
        amount,
        method,
        account,
        status: "pending",
        createdAt: serverTimestamp()
      });

      $("withdrawForm").reset();

      showMessage(
        "withdrawMessage",
        "ບັນທຶກຄຳຮ້ອງແລ້ວ. ລໍຖ້າ Admin ກວດສອບ."
      );

      await loadRequestCounts(currentUser);

    } catch (error) {
      console.error("Withdrawal request error:", error);

      showMessage(
        "withdrawMessage",
        "ສົ່ງຄຳຮ້ອງບໍ່ສຳເລັດ. ກວດສອບ Firebase Rules."
      );
    } finally {
      setButtonLoading(button, false, "ສົ່ງຄຳຮ້ອງ");
    }
  });
}

// -------------------------
// HISTORY ITEM: DEPOSIT / WITHDRAW
// -------------------------

function makeHistoryItem(item, type) {
  const wrapper = document.createElement("div");
  wrapper.className = "history-item";

  const title = document.createElement("strong");

  title.textContent = type === "deposit"
    ? "📥 Deposit Request"
    : "📤 Withdrawal Request";

  const amount = document.createElement("p");
  amount.textContent = "Amount: " + money(item.amount);

  const method = document.createElement("p");
  method.textContent = "Method: " + (item.method || "—");

  const status = document.createElement("p");
  status.className = "history-status";
  status.textContent = "Status: " + (item.status || "pending");

  const date = document.createElement("small");
  date.textContent = "Date: " + formatDate(item.createdAt);

  wrapper.append(title, amount, method, status, date);

  return wrapper;
}

// -------------------------
// HISTORY ITEM: EARNINGS
// -------------------------

function makeEarningsHistoryItem(item) {
  const wrapper = document.createElement("div");
  wrapper.className = "history-item";

  const title = document.createElement("strong");
  title.textContent =
    "💰 Earnings - Round " + (Number(item.round) || "—");

  const amount = document.createElement("p");
  amount.textContent = "Amount: " + money(item.amount);

  const status = document.createElement("p");
  status.className = "history-status";
  status.textContent = "Status: Added by Admin";

  const date = document.createElement("small");
  date.textContent = "Date: " + formatDate(item.createdAt);

  wrapper.append(title, amount, status, date);

  return wrapper;
}

// -------------------------
// LOAD ALL HISTORY
// -------------------------

async function loadHistory() {
  if (!currentUser) return;

  const list = $("historyList");
  if (!list) return;

  list.textContent = "ກຳລັງໂຫຼດ...";

  try {
    const depositQuery = query(
      collection(db, "depositRequests"),
      where("uid", "==", currentUser.uid)
    );

    const withdrawQuery = query(
      collection(db, "withdrawalRequests"),
      where("uid", "==", currentUser.uid)
    );

    const [depositSnapshot, withdrawSnapshot] = await Promise.all([
      getDocs(depositQuery),
      getDocs(withdrawQuery)
    ]);

    const records = [];

    depositSnapshot.forEach(item => {
      records.push({
        ...item.data(),
        type: "deposit"
      });
    });

    withdrawSnapshot.forEach(item => {
      records.push({
        ...item.data(),
        type: "withdraw"
      });
    });

    const earningsHistory = Array.isArray(memberData.earningsHistory)
      ? memberData.earningsHistory
      : [];

    earningsHistory.forEach(item => {
      records.push({
        ...item,
        type: "earnings"
      });
    });

    records.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });

    list.replaceChildren();

    if (records.length === 0) {
      list.textContent = "ຍັງບໍ່ມີປະຫວັດລາຍການ.";
      showMessage("historyMessage", "");
      return;
    }

    records.forEach(record => {
      if (record.type === "earnings") {
        list.appendChild(makeEarningsHistoryItem(record));
      } else {
        list.appendChild(
          makeHistoryItem(record, record.type)
        );
      }
    });

    showMessage("historyMessage", "");

  } catch (error) {
    console.error("History error:", error);

    list.textContent = "ໂຫຼດປະຫວັດບໍ່ສຳເລັດ.";

    showMessage(
      "historyMessage",
      "ກວດສອບການເຊື່ອມຕໍ່ Firebase."
    );
  }
}

if ($("refreshHistoryBtn")) {
  $("refreshHistoryBtn").addEventListener("click", loadHistory);
}

// -------------------------
// COPY ADMIN PHONE
// -------------------------

if ($("copyAdminPhone")) {
  $("copyAdminPhone").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(ADMIN_PHONE);

      showMessage("contactMessage", "ຄັດລອກເບີໂທສຳເລັດ!");

    } catch {
      showMessage("contactMessage", "ບໍ່ສາມາດຄັດລອກໄດ້.");
    }
  });
}

// -------------------------
// LOGOUT
// -------------------------

if ($("logoutBtn")) {
  $("logoutBtn").addEventListener("click", async () => {
    try {
      if (unsubscribeMember) {
        unsubscribeMember();
        unsubscribeMember = null;
      }

      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }

      await signOut(auth);

      window.location.replace("login.html");

    } catch (error) {
      console.error("Logout error:", error);
      alert("ອອກຈາກລະບົບບໍ່ສຳເລັດ.");
    }
  });
}

// -------------------------
// AUTHENTICATION
// -------------------------

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  currentUser = user;

  try {
    await loadMemberData(user);

    updateEarningsDisplay(memberData);
    startStatusCountdown();

    showPage("home");

  } catch (error) {
    console.error("Dashboard loading error:", error);

    if ($("userEmail")) {
      $("userEmail").textContent =
        "ບໍ່ສາມາດໂຫຼດບັນຊີໄດ້.";
    }

    console.error("Member load detail:", error.message);
  }
});
