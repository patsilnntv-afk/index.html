
import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  runTransaction,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const ADMIN_UID = "ItHV6zFppeQQ4Kpukkyg3ynBiPZ2";
const $ = id => document.getElementById(id);

let allMembers = [];

const VIP_CONFIG = {
  0: { rate: 1, min: 1, max: 4.99 },
  1: { rate: 2.2, min: 5, max: 9.99 },
  2: { rate: 3, min: 10, max: 49.99 },
  3: { rate: 3.3, min: 50, max: 99 },
  4: { rate: 3.5, min: 100, max: 200 }
};

function money(value) {
  return "$" + Number(value || 0).toFixed(2);
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function showMessage(message, isError = false) {
  const el = $("adminMessage");
  if (!el) return;

  el.textContent = message;
  el.style.color = isError ? "#ff7777" : "#65df91";
}

// -------------------------
// EARNINGS ROUND SELECTOR
// -------------------------

function setupEarningsRoundSelector() {
  const amountInput = $("earningsAmount");
  if (!amountInput || $("earningsRound")) return;

  const wrapper = document.createElement("div");
  wrapper.style.margin = "12px 0";

  const label = document.createElement("label");
  label.textContent = "ເລືອກຮອບກຳໄລ";
  label.style.display = "block";
  label.style.marginBottom = "6px";

  const select = document.createElement("select");
  select.id = "earningsRound";
  select.style.width = "100%";
  select.style.padding = "10px";

  [
    ["1", "ຮອບທີ 1"],
    ["2", "ຮອບທີ 2"],
    ["3", "ຮອບທີ 3"],
    ["4", "ຮອບທີ 4"]
  ].forEach(([value, text]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    select.appendChild(option);
  });

  wrapper.append(label, select);
  amountInput.insertAdjacentElement("afterend", wrapper);
}

// -------------------------
// PAGE NAVIGATION
// -------------------------

function showAdminPage(pageId) {
  document.querySelectorAll(".admin-page").forEach(page => {
    page.classList.toggle("active", page.id === pageId);
  });

  document.querySelectorAll(".admin-menu button").forEach(button => {
    button.classList.toggle("active", button.dataset.page === pageId);
  });
}

document.querySelectorAll(".admin-menu button").forEach(button => {
  button.addEventListener("click", () => {
    showAdminPage(button.dataset.page);
  });
});

// -------------------------
// FIND MEMBER BY UID
// -------------------------

async function findMemberByUid(uid) {
  const memberUid = String(uid || "").trim();

  if (!memberUid) {
    throw new Error("ບໍ່ມີ UID ສະມາຊິກ");
  }

  const directRef = doc(db, "users", memberUid);
  const directSnapshot = await getDoc(directRef);

  if (directSnapshot.exists()) {
    return directRef;
  }

  const usersSnapshot = await getDocs(collection(db, "users"));

  const matchedUser = usersSnapshot.docs.find(item => {
    const data = item.data();

    return (
      item.id === memberUid ||
      String(data.uid || "").trim() === memberUid ||
      String(data.id || "").trim() === memberUid
    );
  });

  if (matchedUser) return matchedUser.ref;

  throw new Error("ບໍ່ພົບສະມາຊິກ UID: " + memberUid);
}

// -------------------------
// LOAD DASHBOARD
// -------------------------

async function loadDashboard() {
  const [members, deposits, withdrawals] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "depositRequests")),
    getDocs(collection(db, "withdrawalRequests"))
  ]);

  allMembers = members.docs.map(item => {
    const data = item.data();

    return {
      docId: item.id,
      ...data,
      uid: data.uid || data.id || item.id
    };
  });

  if ($("totalMembers")) {
    $("totalMembers").textContent = allMembers.length;
  }

  if ($("totalBalance")) {
    $("totalBalance").textContent = money(
      allMembers.reduce(
        (sum, member) => sum + Number(member.demoBalance || 0),
        0
      )
    );
  }

  if ($("pendingRequests")) {
    $("pendingRequests").textContent =
      deposits.docs.filter(x => x.data().status === "pending").length +
      withdrawals.docs.filter(x => x.data().status === "pending").length;
  }

  renderMembers(allMembers);
  renderRequests(deposits, "depositRequestsList", "deposit");
  renderRequests(withdrawals, "withdrawalRequestsList", "withdrawal");
}

// -------------------------
// MEMBERS
// -------------------------

function renderMembers(members) {
  const container = $("vipMembers");
  if (!container) return;

  if (!members.length) {
    container.textContent = "ບໍ່ພົບສະມາຊິກ";
    return;
  }

  container.innerHTML = members.map(member => {
    const level = Math.max(0, Math.min(4, Number(member.vipLevel) || 0));
    const vip = VIP_CONFIG[level];

    return `
      <div class="member-item">
        <strong>${safe(member.name || "No name")}</strong>
        <p>Email: ${safe(member.email || "")}</p>
        <p>UID: ${safe(member.uid)}</p>
        <p>Balance: ${money(member.demoBalance)}</p>
        <p>Earnings: ${money(member.totalEarnings)}</p>
        <p>VIP: ${level}</p>
        <p>VIP rate: ${vip.rate}% / day</p>
        <p>Balance range: ${money(vip.min)} - ${money(vip.max)}</p>

        <select data-vip-select="${safe(member.docId)}">
          ${[0, 1, 2, 3, 4].map(n => `
            <option value="${n}" ${level === n ? "selected" : ""}>
              VIP ${n}
            </option>
          `).join("")}
        </select>

        <button type="button" data-save-vip="${safe(member.docId)}">
          ບັນທຶກ VIP
        </button>
      </div>
    `;
  }).join("");
}

$("searchBtn")?.addEventListener("click", () => {
  const keyword = $("memberSearch").value.trim().toLowerCase();

  renderMembers(allMembers.filter(member =>
    String(member.name || "").toLowerCase().includes(keyword) ||
    String(member.email || "").toLowerCase().includes(keyword) ||
    String(member.uid || "").toLowerCase().includes(keyword)
  ));
});

$("memberSearch")?.addEventListener("keydown", event => {
  if (event.key === "Enter") $("searchBtn").click();
});

// -------------------------
// SAVE VIP
// -------------------------

$("vipMembers")?.addEventListener("click", async event => {
  const button = event.target.closest("[data-save-vip]");
  if (!button) return;

  const docId = button.dataset.saveVip;

  const select = [...document.querySelectorAll("[data-vip-select]")]
    .find(item => item.dataset.vipSelect === docId);

  const level = Number(select?.value);

  if (!Number.isInteger(level) || level < 0 || level > 4) {
    showMessage("ລະດັບ VIP ບໍ່ຖືກຕ້ອງ", true);
    return;
  }

  button.disabled = true;

  try {
    const vip = VIP_CONFIG[level];

    await updateDoc(doc(db, "users", docId), {
      vipLevel: level,
      vipRate: vip.rate,
      vipMinBalance: vip.min,
      vipMaxBalance: vip.max,
      vipUpdatedAt: serverTimestamp()
    });

    showMessage("ບັນທຶກ VIP ສຳເລັດ");
    await loadDashboard();

  } catch (error) {
    console.error(error);
    showMessage(error.message, true);
  } finally {
    button.disabled = false;
  }
});

// -------------------------
// REQUEST LIST
// -------------------------

function renderRequests(snapshot, containerId, type) {
  const container = $(containerId);
  if (!container) return;

  const requests = snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .filter(item => item.status === "pending");

  if (!requests.length) {
    container.innerHTML = "<p>ບໍ່ມີລາຍການລໍຖ້າ</p>";
    return;
  }

  container.innerHTML = requests.map(item => `
    <div class="request-item">
      <p><strong>ຈຳນວນ:</strong> ${money(item.amount)}</p>
      <p><strong>UID:</strong> ${safe(
        item.uid || item.userId || item.memberUid || "ບໍ່ມີ UID"
      )}</p>
      <p><strong>ວິທີ:</strong> ${safe(item.method)}</p>
      <p><strong>ບັນຊີ:</strong> ${safe(item.account)}</p>
      <p>ສະຖານະ: ລໍຖ້າອະນຸມັດ</p>

      <div class="request-actions">
        <button class="approve-btn"
          data-action="approve"
          data-type="${type}"
          data-id="${safe(item.id)}">
          ອະນຸມັດ
        </button>

        <button class="reject-btn"
          data-action="reject"
          data-type="${type}"
          data-id="${safe(item.id)}">
          ປະຕິເສດ
        </button>
      </div>
    </div>
  `).join("");
}

// -------------------------
// PROCESS DEPOSIT / WITHDRAWAL
// -------------------------

async function processRequest(type, requestId, action) {
  const collectionName = type === "deposit"
    ? "depositRequests"
    : "withdrawalRequests";

  const requestRef = doc(db, collectionName, requestId);
  const initialSnapshot = await getDoc(requestRef);

  if (!initialSnapshot.exists()) {
    throw new Error("ບໍ່ພົບຄຳຂໍ");
  }

  const initialData = initialSnapshot.data();
  let userRef = null;

  if (action === "approve") {
    const uid = String(
      initialData.uid || initialData.userId || initialData.memberUid || ""
    ).trim();

    userRef = await findMemberByUid(uid);
  }

  await runTransaction(db, async transaction => {
    const requestSnapshot = await transaction.get(requestRef);

    if (!requestSnapshot.exists()) {
      throw new Error("ບໍ່ພົບຄຳຂໍ");
    }

    const requestData = requestSnapshot.data();

    if (requestData.status !== "pending") {
      throw new Error("ຄຳຂໍນີ້ຖືກດຳເນີນການແລ້ວ");
    }

    if (action === "reject") {
      transaction.update(requestRef, {
        status: "rejected",
        reviewedAt: serverTimestamp()
      });
      return;
    }

    const uid = String(
      requestData.uid || requestData.userId || requestData.memberUid || ""
    ).trim();

    const originalUid = String(
      initialData.uid || initialData.userId || initialData.memberUid || ""
    ).trim();

    if (!uid || uid !== originalUid) {
      throw new Error("UID ຂອງຄຳຂໍບໍ່ກົງກັນ");
    }

    const userSnapshot = await transaction.get(userRef);

    if (!userSnapshot.exists()) {
      throw new Error("ບໍ່ພົບສະມາຊິກ");
    }

    const userData = userSnapshot.data();

    const storedUid = String(
      userData.uid || userData.id || userSnapshot.id
    ).trim();

    if (storedUid !== uid) {
      throw new Error("UID ບໍ່ກົງກັນ");
    }

    const amount = Number(requestData.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("ຈຳນວນເງິນບໍ່ຖືກຕ້ອງ");
    }

    const currentBalance = Number(userData.demoBalance || 0);

    if (type === "withdrawal" && currentBalance < amount) {
      throw new Error("ຍອດເງິນບໍ່ພຽງພໍ");
    }

    const newBalance = type === "deposit"
      ? currentBalance + amount
      : currentBalance - amount;

    transaction.update(userRef, {
      demoBalance: Number(newBalance.toFixed(2))
    });

    transaction.update(requestRef, {
      status: "approved",
      reviewedAt: serverTimestamp()
    });
  });
}

document.addEventListener("click", async event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const { action, type, id } = button.dataset;

  if (!confirm(
    action === "approve"
      ? "ຢືນຢັນອະນຸມັດບໍ?"
      : "ຢືນຢັນປະຕິເສດບໍ?"
  )) return;

  button.disabled = true;

  try {
    await processRequest(type, id, action);
    showMessage("ດຳເນີນການສຳເລັດ");
    await loadDashboard();

  } catch (error) {
    console.error(error);
    showMessage(error.message, true);
    button.disabled = false;
  }
});

// -------------------------
// REFRESH REQUESTS
// -------------------------

$("refreshDeposits")?.addEventListener("click", async () => {
  try {
    const snapshot = await getDocs(collection(db, "depositRequests"));
    renderRequests(snapshot, "depositRequestsList", "deposit");
  } catch (error) {
    showMessage(error.message, true);
  }
});

$("refreshWithdrawals")?.addEventListener("click", async () => {
  try {
    const snapshot = await getDocs(collection(db, "withdrawalRequests"));
    renderRequests(snapshot, "withdrawalRequestsList", "withdrawal");
  } catch (error) {
    showMessage(error.message, true);
  }
});

// -------------------------
// ADD EARNINGS
// -------------------------

$("saveEarningsBtn")?.addEventListener("click", async () => {
  const uid = $("earningsUid")?.value.trim();
  const amountText = $("earningsAmount")?.value.trim();
  const amount = Number(amountText);
  const round = Number($("earningsRound")?.value || 1);
  const message = $("earningsMessage");
  const button = $("saveEarningsBtn");

  if (!uid || amountText === "" ||
      !Number.isFinite(amount) || amount <= 0) {
    if (message) message.textContent = "ກວດ UID ແລະຈຳນວນເງິນ";
    return;
  }

  if (!Number.isInteger(round) || round < 1 || round > 4) {
    if (message) message.textContent = "ເລືອກຮອບບໍ່ຖືກຕ້ອງ";
    return;
  }

  button.disabled = true;

  try {
    const userRef = await findMemberByUid(uid);

    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(userRef);

      if (!snapshot.exists()) {
        throw new Error("ບໍ່ພົບສະມາຊິກ");
      }

      const data = snapshot.data();

      const oldBalance = Number(data.demoBalance || 0);
      const oldEarnings = Number(data.totalEarnings || 0);

      const newBalance = Number((oldBalance + amount).toFixed(2));
      const newEarnings = Number((oldEarnings + amount).toFixed(2));

      const oldHistory = Array.isArray(data.earningsHistory)
        ? data.earningsHistory
        : [];

      const record = {
        amount: Number(amount.toFixed(2)),
        round,
        createdAt: Timestamp.now(),
        type: "admin_credit"
      };

      // Keep the latest 30 records in the member document.
      const newHistory = [...oldHistory, record].slice(-30);

      transaction.update(userRef, {
        demoBalance: newBalance,
        totalEarnings: newEarnings,
        earningsHistory: newHistory,
        lastEarningsRound: round,
        earningsUpdatedAt: serverTimestamp()
      });
    });

    if (message) {
      message.textContent =
        "ເພີ່ມກຳໄລຮອບທີ " + round +
        " ສຳເລັດ: " + money(amount);
    }

    $("earningsAmount").value = "";

    await loadDashboard();

  } catch (error) {
    console.error("Add earnings error:", error);

    if (message) message.textContent = error.message;

  } finally {
    button.disabled = false;
  }
});

// -------------------------
// LOGOUT
// -------------------------

$("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// -------------------------
// AUTHENTICATION
// -------------------------

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  if (user.uid !== ADMIN_UID) {
    alert("ບໍ່ມີສິດເຂົ້າໜ້າ Admin");
    await signOut(auth);
    window.location.href = "login.html";
    return;
  }

  try {
    setupEarningsRoundSelector();
    await loadDashboard();

  } catch (error) {
    console.error("Dashboard loading error:", error);

    showMessage(
      "ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ: " + error.message,
      true
    );
  }
});
