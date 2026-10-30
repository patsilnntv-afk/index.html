
const translations = {
  en: {
    welcome: "Welcome Back",
    login: "Login",
    loginSubtitle: "Login to your account",
    register: "Register",
    logout: "Logout",
    email: "Email Address",
    password: "Password",
    fullName: "Full Name",
    inviteCode: "Invite Code",
    createAccount: "Create Account",
    join: "Join PROSHOP V2",
    alreadyAccount: "Already have an account?",
    dashboard: "Member Dashboard",
    admin: "Admin Dashboard",
    welcomeSite: "Welcome to PROSHOP V2",
    totalMembers: "Total Members",
    totalBalance: "Total Balance",
    totalInvestment: "Total Investment",
    totalProfit: "Total Profit",
    pendingRequests: "Pending Requests",
    managementCenter: "Management Center",
    simulatedFunds: "Simulated funds only",
    loading: "Loading..."
  },

  lo: {
    welcome: "ຍິນດີຕ້ອນຮັບ",
    login: "ເຂົ້າລະບົບ",
    loginSubtitle: "ເຂົ້າລະບົບບັນຊີຂອງທ່ານ",
    register: "ສະໝັກສະມາຊິກ",
    logout: "ອອກຈາກລະບົບ",
    email: "ອີເມວ",
    password: "ລະຫັດຜ່ານ",
    fullName: "ຊື່ເຕັມ",
    inviteCode: "ລະຫັດເຊີນ",
    createAccount: "ສ້າງບັນຊີ",
    join: "ເຂົ້າຮ່ວມ PROSHOP V2",
    alreadyAccount: "ມີບັນຊີແລ້ວບໍ?",
    dashboard: "ໜ້າສະມາຊິກ",
    admin: "ໜ້າຜູ້ດູແລ",
    welcomeSite: "ຍິນດີຕ້ອນຮັບ PROSHOP V2",
    totalMembers: "ສະມາຊິກທັງໝົດ",
    totalBalance: "ຍອດເງິນລວມ",
    totalInvestment: "ຍອດລົງທຶນ",
    totalProfit: "ກຳໄລລວມ",
    pendingRequests: "ຄຳຮ້ອງລໍຖ້າ",
    managementCenter: "ສູນຈັດການ",
    simulatedFunds: "ຍອດເງິນຈຳລອງ",
    loading: "ກຳລັງໂຫຼດ..."
  },

  th: {
    welcome: "ยินดีต้อนรับกลับ",
    login: "เข้าสู่ระบบ",
    loginSubtitle: "เข้าสู่ระบบบัญชีของคุณ",
    register: "สมัครสมาชิก",
    logout: "ออกจากระบบ",
    email: "อีเมล",
    password: "รหัสผ่าน",
    fullName: "ชื่อเต็ม",
    inviteCode: "รหัสเชิญ",
    createAccount: "สร้างบัญชี",
    join: "เข้าร่วม PROSHOP V2",
    alreadyAccount: "มีบัญชีอยู่แล้วใช่ไหม?",
    dashboard: "หน้าสมาชิก",
    admin: "หน้าแอดมิน",
    welcomeSite: "ยินดีต้อนรับสู่ PROSHOP V2",
    totalMembers: "สมาชิกทั้งหมด",
    totalBalance: "ยอดเงินรวม",
    totalInvestment: "ยอดลงทุน",
    totalProfit: "กำไรรวม",
    pendingRequests: "คำขอที่รอดำเนินการ",
    managementCenter: "ศูนย์จัดการ",
    simulatedFunds: "ยอดเงินจำลอง",
    loading: "กำลังโหลด..."
  }
};

function applyLanguage(lang) {
  const selectedLang = translations[lang] ? lang : "en";
  const words = translations[selectedLang];

  document.documentElement.lang = selectedLang;

  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;
    if (words[key]) {
      element.textContent = words[key];
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
    const key = element.dataset.i18nPlaceholder;
    if (words[key]) {
      element.placeholder = words[key];
    }
  });

  localStorage.setItem("proshop-language", selectedLang);
}

document.addEventListener("DOMContentLoaded", () => {
  const selector = document.getElementById("languageSelect");
  const saved = localStorage.getItem("proshop-language") || "en";

  if (selector) {
    selector.value = translations[saved] ? saved : "en";

    selector.addEventListener("change", () => {
      applyLanguage(selector.value);
    });
  }

  applyLanguage(saved);
});
