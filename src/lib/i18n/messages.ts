import type { WorkspaceRole } from "@/lib/types/workspace";
import type {
  AssetType,
  BrandStatus,
  ColorRole,
  FontRole,
  ReferenceType,
} from "@/lib/types/brand";

export type Locale = "en" | "id";

export const LOCALE_COOKIE = "acs_lang";

export function normalizeLocale(value?: string | null): Locale {
  return value === "id" ? "id" : "en";
}

export interface Dictionary {
  common: {
    brand: string;
    cancel: string;
    save: string;
    saving: string;
    create: string;
    creating: string;
    close: string;
    remove: string;
    removing: string;
    accept: string;
    joining: string;
    revoke: string;
    revoking: string;
    delete: string;
    deleting: string;
    add: string;
    adding: string;
    upload: string;
    uploading: string;
    back: string;
    open: string;
    search: string;
    all: string;
    you: string;
    unnamedUser: string;
    configNotice: string;
    connectionFailed: string;
  };
  landing: {
    signIn: string;
    createAccount: string;
    openStudio: string;
    heroTitle: string;
    heroSubtitle: string;
    getStarted: string;
    feature1Title: string;
    feature1Desc: string;
    feature2Title: string;
    feature2Desc: string;
    feature3Title: string;
    feature3Desc: string;
  };
  auth: {
    signInTitle: string;
    signUpTitle: string;
    resetTitle: string;
    email: string;
    password: string;
    newPassword: string;
    fullName: string;
    forgotPassword: string;
    signingIn: string;
    signInBtn: string;
    noAccount: string;
    createAccountLink: string;
    creatingAccount: string;
    createAccountBtn: string;
    haveAccount: string;
    signInLink: string;
    minPasswordPlaceholder: string;
    verificationSent: string;
    backToSignIn: string;
    resetModalTitle: string;
    resetModalDesc: string;
    resetSentNotice: string;
    done: string;
    sending: string;
    sendResetLink: string;
    updating: string;
    updatePassword: string;
    invalidAuthLink: string;
    invalidCredentials: string;
    unableCreateAccount: string;
    unableReset: string;
    unableUpdatePassword: string;
  };
  shell: {
    dashboard: string;
    brands: string;
    workspace: string;
    workspaces: string;
    noWorkspace: string;
    noWorkspacesYet: string;
    createWorkspace: string;
    newWorkspace: string;
    profile: string;
    signOut: string;
    expandSidebar: string;
    minimizeSidebar: string;
    openNav: string;
    closeNav: string;
    selectWorkspace: string;
  };
  dialogs: {
    newWorkspaceTitle: string;
    newWorkspaceDesc: string;
    workspaceNameLabel: string;
    workspacePlaceholder: string;
    profileTitle: string;
    profileDesc: string;
    emailLabel: string;
    fullNameLabel: string;
  };
  dashboard: {
    title: string;
    pendingInvitations: string;
    rolePrefix: string;
    emptyTitle: string;
    emptyDesc: string;
    activeWorkspace: string;
    planLabel: string;
    teamMembers: string;
    activeSeats: string;
    workspacesLabel: string;
    accessibleAccounts: string;
    workspaceMembers: string;
    manageTeam: string;
    colMember: string;
    colEmail: string;
    colRole: string;
    colJoined: string;
  };
  settings: {
    title: string;
    noWorkspaceTitle: string;
    noWorkspaceDesc: string;
    general: string;
    workspaceName: string;
    saveChanges: string;
    workspaceUpdated: string;
    membersCount: (count: number) => string;
    addMember: string;
    colName: string;
    colEmail: string;
    colRole: string;
    colAction: string;
    pendingInvitationsCount: (count: number) => string;
    colExpires: string;
    rolePermissions: string;
    colAccessScope: string;
    deleteWorkspace: string;
    deleteWorkspaceDesc: string;
    inviteTitle: string;
    inviteDesc: string;
    inviteEmailPlaceholder: string;
    adding: string;
    memberAdded: string;
    invitationCreated: string;
    removeTitle: string;
    removeDesc: (name: string, wsName: string) => string;
    deleteTitle: (wsName: string) => string;
    deleteDesc: string;
    thisMember: string;
  };
  brands: {
    title: string;
    newTitle: string;
    detailTitle: string;
    newBrand: string;
    searchPlaceholder: string;
    emptyTitle: string;
    emptyDesc: string;
    noMatches: string;
    noWorkspaceDesc: string;
    colBrand: string;
    colIndustry: string;
    colStatus: string;
    colUpdated: string;
    identitySection: string;
    brandName: string;
    brandNamePlaceholder: string;
    industry: string;
    industryPlaceholder: string;
    description: string;
    descriptionPlaceholder: string;
    starterPalette: string;
    primaryColor: string;
    secondaryColor: string;
    textColor: string;
    starterTypography: string;
    headingFont: string;
    bodyFont: string;
    tabDna: string;
    tabPalette: string;
    tabAssets: string;
    tabReferences: string;
    personality: string;
    personalityPlaceholder: string;
    positioning: string;
    positioningPlaceholder: string;
    audience: string;
    audiencePlaceholder: string;
    tone: string;
    tonePlaceholder: string;
    visualRules: string;
    visualRulesPlaceholder: string;
    forbiddenElements: string;
    forbiddenPlaceholder: string;
    layoutPreferences: string;
    layoutPlaceholder: string;
    imageDirection: string;
    imageDirectionPlaceholder: string;
    savedNotice: string;
    colorsTitle: string;
    colorName: string;
    colorNamePlaceholder: string;
    colorHex: string;
    colorRole: string;
    addColor: string;
    noColors: string;
    fontsTitle: string;
    fontFamily: string;
    fontFamilyPlaceholder: string;
    fontRole: string;
    fontWeights: string;
    fontFileOptional: string;
    noLinkedFile: string;
    addFont: string;
    noFonts: string;
    assetsTitle: string;
    assetType: string;
    assetFile: string;
    assetAlt: string;
    assetAltPlaceholder: string;
    assetConstraints: string;
    noAssets: string;
    referencesTitle: string;
    referenceType: string;
    linkedAsset: string;
    noAssetLink: string;
    referenceNotes: string;
    referenceNotesPlaceholder: string;
    addReference: string;
    noReferences: string;
    deleteBrandTitle: (name: string) => string;
    deleteBrandDesc: string;
    deleteAssetTitle: string;
    deleteAssetDesc: string;
    readOnlyNotice: string;
    statuses: Record<BrandStatus, string>;
    colorRoles: Record<ColorRole, string>;
    fontRoles: Record<FontRole, string>;
    assetTypes: Record<AssetType, string>;
    referenceTypes: Record<ReferenceType, string>;
  };
  roles: Record<WorkspaceRole, string>;
  roleCapabilities: Record<WorkspaceRole, string>;
}

const EN: Dictionary = {
  common: {
    brand: "AI Creative Studio",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving...",
    create: "Create",
    creating: "Creating...",
    close: "Close",
    remove: "Remove",
    removing: "Removing...",
    accept: "Accept",
    joining: "Joining...",
    revoke: "Revoke",
    revoking: "Revoking...",
    delete: "Delete",
    deleting: "Deleting...",
    add: "Add",
    adding: "Adding...",
    upload: "Upload",
    uploading: "Uploading...",
    back: "Back",
    open: "Open",
    search: "Search",
    all: "All",
    you: "(You)",
    unnamedUser: "Unnamed User",
    configNotice: "Service setup required before sign-in is active.",
    connectionFailed: "Connection failed.",
  },
  landing: {
    signIn: "Sign In",
    createAccount: "Create Account",
    openStudio: "Open Studio",
    heroTitle: "Brand-first Instagram carousel production.",
    heroSubtitle:
      "Multi-workspace creative studio for agencies and teams. Store Brand DNA, generate structured carousels, edit every element on canvas, and export PNG, JPG, and PDF.",
    getStarted: "Get Started",
    feature1Title: "Isolated Workspaces",
    feature1Desc:
      "Role-based access and row-level isolation per client workspace.",
    feature2Title: "Brand DNA Control",
    feature2Desc:
      "Consistent typography, color tokens, assets, and layout rules.",
    feature3Title: "Editable Scene Graph",
    feature3Desc:
      "Every slide stored as structured JSON for canvas editing and export.",
  },
  auth: {
    signInTitle: "Sign In",
    signUpTitle: "Create Account",
    resetTitle: "Set New Password",
    email: "Email",
    password: "Password",
    newPassword: "New Password",
    fullName: "Full Name",
    forgotPassword: "Forgot password?",
    signingIn: "Signing in...",
    signInBtn: "Sign In",
    noAccount: "No account yet?",
    createAccountLink: "Create account",
    creatingAccount: "Creating account...",
    createAccountBtn: "Create Account",
    haveAccount: "Already have an account?",
    signInLink: "Sign In",
    minPasswordPlaceholder: "Minimum 8 characters",
    verificationSent:
      "Verification link sent. Check your email to activate your account.",
    backToSignIn: "Back to Sign In",
    resetModalTitle: "Reset Password",
    resetModalDesc: "Enter your email to receive a password reset link.",
    resetSentNotice:
      "If an account exists for that email, a reset link has been sent.",
    done: "Done",
    sending: "Sending...",
    sendResetLink: "Send Reset Link",
    updating: "Updating...",
    updatePassword: "Update Password",
    invalidAuthLink: "Unable to verify authentication link.",
    invalidCredentials: "Unable to sign in with those credentials.",
    unableCreateAccount: "Unable to create account with those details.",
    unableReset: "Unable to send reset link.",
    unableUpdatePassword: "Unable to update password.",
  },
  shell: {
    dashboard: "Dashboard",
    brands: "Brands",
    workspace: "Workspace",
    workspaces: "Workspaces",
    noWorkspace: "No Workspace",
    noWorkspacesYet: "No workspaces yet",
    createWorkspace: "Create Workspace",
    newWorkspace: "New Workspace",
    profile: "Profile",
    signOut: "Sign Out",
    expandSidebar: "Expand sidebar",
    minimizeSidebar: "Minimize sidebar",
    openNav: "Open navigation",
    closeNav: "Close navigation",
    selectWorkspace: "Select Workspace",
  },
  dialogs: {
    newWorkspaceTitle: "New Workspace",
    newWorkspaceDesc:
      "Create an isolated workspace for brands and team members.",
    workspaceNameLabel: "Workspace Name",
    workspacePlaceholder: "Acme Creative Agency",
    profileTitle: "Profile",
    profileDesc: "Manage your account display name.",
    emailLabel: "Email",
    fullNameLabel: "Full Name",
  },
  dashboard: {
    title: "Dashboard",
    pendingInvitations: "Pending Workspace Invitations",
    rolePrefix: "Role",
    emptyTitle: "Create your first workspace",
    emptyDesc:
      "Workspaces isolate brand assets, team members, and carousel projects.",
    activeWorkspace: "Active Workspace",
    planLabel: "Plan",
    teamMembers: "Team Members",
    activeSeats: "Active workspace seats",
    workspacesLabel: "Workspaces",
    accessibleAccounts: "Accessible accounts",
    workspaceMembers: "Workspace Members",
    manageTeam: "Manage Team",
    colMember: "Member",
    colEmail: "Email",
    colRole: "Role",
    colJoined: "Joined",
  },
  settings: {
    title: "Workspace Settings",
    noWorkspaceTitle: "No active workspace",
    noWorkspaceDesc: "Create a workspace to manage members and roles.",
    general: "General",
    workspaceName: "Workspace Name",
    saveChanges: "Save Changes",
    workspaceUpdated: "Workspace updated.",
    membersCount: (count) => `Members (${count})`,
    addMember: "Add Member",
    colName: "Name",
    colEmail: "Email",
    colRole: "Role",
    colAction: "Action",
    pendingInvitationsCount: (count) => `Pending Invitations (${count})`,
    colExpires: "Expires",
    rolePermissions: "Role Permissions",
    colAccessScope: "Access Scope",
    deleteWorkspace: "Delete Workspace",
    deleteWorkspaceDesc:
      "Permanently removes this workspace and all memberships.",
    inviteTitle: "Add Workspace Member",
    inviteDesc:
      "Invite a team member by email and assign their workspace role.",
    inviteEmailPlaceholder: "teammate@company.com",
    adding: "Adding...",
    memberAdded: "Member added to workspace.",
    invitationCreated: "Invitation created.",
    removeTitle: "Remove Member",
    removeDesc: (name, wsName) => `Remove ${name} from ${wsName}?`,
    deleteTitle: (wsName) => `Delete ${wsName}`,
    deleteDesc:
      "This action permanently deletes the workspace and cannot be undone.",
    thisMember: "this member",
  },
  brands: {
    title: "Brands",
    newTitle: "New Brand",
    detailTitle: "Brand Profile",
    newBrand: "New Brand",
    searchPlaceholder: "Search brands...",
    emptyTitle: "No brands yet",
    emptyDesc: "Create a brand to store Brand DNA, palette, fonts, and assets.",
    noMatches: "No matching brands.",
    noWorkspaceDesc: "Create a workspace before adding brands.",
    colBrand: "Brand",
    colIndustry: "Industry",
    colStatus: "Status",
    colUpdated: "Updated",
    identitySection: "Identity",
    brandName: "Brand Name",
    brandNamePlaceholder: "Kopi Senja",
    industry: "Industry",
    industryPlaceholder: "Food & Beverage",
    description: "Description",
    descriptionPlaceholder: "Short positioning summary",
    starterPalette: "Starter Colors",
    primaryColor: "Primary",
    secondaryColor: "Secondary",
    textColor: "Text",
    starterTypography: "Starter Fonts",
    headingFont: "Heading Font",
    bodyFont: "Body Font",
    tabDna: "Brand DNA",
    tabPalette: "Colors & Fonts",
    tabAssets: "Assets",
    tabReferences: "References",
    personality: "Personality",
    personalityPlaceholder: "Warm, modern, editorial",
    positioning: "Positioning",
    positioningPlaceholder: "Specialty artisan coffee for urban creatives",
    audience: "Target Audience",
    audiencePlaceholder: "24–38 urban professionals",
    tone: "Tone of Voice",
    tonePlaceholder: "Crisp, confident, minimal",
    visualRules: "Visual Rules",
    visualRulesPlaceholder: "Generous whitespace, crisp contrast",
    forbiddenElements: "Forbidden Elements",
    forbiddenPlaceholder: "Neon gradients, cluttered badges",
    layoutPreferences: "Layout Preferences",
    layoutPlaceholder: "Editorial grid, strong headline hierarchy",
    imageDirection: "Image Direction",
    imageDirectionPlaceholder: "Natural daylight photography",
    savedNotice: "Changes saved.",
    colorsTitle: "Color Palette",
    colorName: "Label",
    colorNamePlaceholder: "Brand Blue",
    colorHex: "Hex",
    colorRole: "Role",
    addColor: "Add Color",
    noColors: "No colors added.",
    fontsTitle: "Typography",
    fontFamily: "Font Family",
    fontFamilyPlaceholder: "Plus Jakarta Sans",
    fontRole: "Role",
    fontWeights: "Weights",
    fontFileOptional: "Font File (Optional)",
    noLinkedFile: "System / Web Font",
    addFont: "Add Font",
    noFonts: "No fonts added.",
    assetsTitle: "Brand Assets",
    assetType: "Type",
    assetFile: "File",
    assetAlt: "Label / Alt Text",
    assetAltPlaceholder: "Primary horizontal logo",
    assetConstraints: "Images: PNG/JPG/WEBP/SVG up to 10 MB · Fonts: WOFF2/TTF/OTF up to 5 MB",
    noAssets: "No assets uploaded.",
    referencesTitle: "Visual References",
    referenceType: "Type",
    linkedAsset: "Linked Asset",
    noAssetLink: "Notes only",
    referenceNotes: "Notes",
    referenceNotesPlaceholder: "Keep headline alignment clean on left margin",
    addReference: "Add Reference",
    noReferences: "No references recorded.",
    deleteBrandTitle: (name) => `Delete ${name}`,
    deleteBrandDesc:
      "Removes this brand, Brand DNA, assets, and references permanently.",
    deleteAssetTitle: "Delete Asset",
    deleteAssetDesc: "Removes this file from storage and brand library.",
    readOnlyNotice: "Read-only access for your workspace role.",
    statuses: {
      draft: "Draft",
      approved: "Approved",
      archived: "Archived",
    },
    colorRoles: {
      primary: "Primary",
      secondary: "Secondary",
      accent: "Accent",
      background: "Background",
      text: "Text",
      neutral: "Neutral",
    },
    fontRoles: {
      heading: "Heading",
      body: "Body",
      accent: "Accent",
    },
    assetTypes: {
      logo: "Logo",
      photo: "Photo",
      pattern: "Pattern",
      icon: "Icon",
      font: "Font",
    },
    referenceTypes: {
      liked: "Liked",
      disliked: "Disliked",
      mandatory: "Mandatory",
    },
  },
  roles: {
    owner: "Owner",
    admin: "Admin",
    designer: "Designer",
    content_creator: "Content Creator",
    client: "Client",
  },
  roleCapabilities: {
    owner: "Full workspace, members, brands, projects, settings",
    admin: "Brands, projects, assets, non-owner members",
    designer: "View brands, manage projects, edit canvas, export",
    content_creator: "Manage briefs and copywriting",
    client: "Preview shared projects, comment, limited approval",
  },
};

const ID: Dictionary = {
  common: {
    brand: "AI Creative Studio",
    cancel: "Batal",
    save: "Simpan",
    saving: "Menyimpan...",
    create: "Buat",
    creating: "Membuat...",
    close: "Tutup",
    remove: "Hapus",
    removing: "Menghapus...",
    accept: "Terima",
    joining: "Bergabung...",
    revoke: "Batalkan",
    revoking: "Membatalkan...",
    delete: "Hapus",
    deleting: "Menghapus...",
    add: "Tambah",
    adding: "Menambahkan...",
    upload: "Unggah",
    uploading: "Mengunggah...",
    back: "Kembali",
    open: "Buka",
    search: "Cari",
    all: "Semua",
    you: "(Anda)",
    unnamedUser: "Pengguna",
    configNotice: "Pengaturan layanan diperlukan sebelum masuk dapat digunakan.",
    connectionFailed: "Koneksi gagal.",
  },
  landing: {
    signIn: "Masuk",
    createAccount: "Buat Akun",
    openStudio: "Buka Studio",
    heroTitle: "Produksi carousel Instagram berbasis identitas brand.",
    heroSubtitle:
      "Studio kreatif multi-workspace untuk agensi dan tim. Simpan Brand DNA, buat carousel terstruktur, edit di canvas, lalu ekspor ke PNG, JPG, dan PDF.",
    getStarted: "Mulai Sekarang",
    feature1Title: "Workspace Terisolasi",
    feature1Desc:
      "Akses berbasis peran dan isolasi data per workspace klien.",
    feature2Title: "Kontrol Brand DNA",
    feature2Desc:
      "Tipografi, palet warna, aset, dan aturan visual yang konsisten.",
    feature3Title: "Scene Graph Editable",
    feature3Desc:
      "Setiap slide tersimpan sebagai JSON terstruktur untuk edit dan ekspor.",
  },
  auth: {
    signInTitle: "Masuk",
    signUpTitle: "Buat Akun",
    resetTitle: "Atur Kata Sandi Baru",
    email: "Email",
    password: "Kata Sandi",
    newPassword: "Kata Sandi Baru",
    fullName: "Nama Lengkap",
    forgotPassword: "Lupa kata sandi?",
    signingIn: "Sedang masuk...",
    signInBtn: "Masuk",
    noAccount: "Belum punya akun?",
    createAccountLink: "Buat akun",
    creatingAccount: "Membuat akun...",
    createAccountBtn: "Buat Akun",
    haveAccount: "Sudah punya akun?",
    signInLink: "Masuk",
    minPasswordPlaceholder: "Minimal 8 karakter",
    verificationSent:
      "Tautan verifikasi terkirim. Periksa email Anda untuk mengaktifkan akun.",
    backToSignIn: "Kembali ke Masuk",
    resetModalTitle: "Atur Ulang Kata Sandi",
    resetModalDesc:
      "Masukkan email Anda untuk menerima tautan atur ulang kata sandi.",
    resetSentNotice:
      "Jika akun terdaftar dengan email tersebut, tautan atur ulang telah dikirim.",
    done: "Selesai",
    sending: "Mengirim...",
    sendResetLink: "Kirim Tautan",
    updating: "Memperbarui...",
    updatePassword: "Simpan Kata Sandi",
    invalidAuthLink: "Tautan autentikasi tidak dapat diverifikasi.",
    invalidCredentials: "Tidak dapat masuk dengan kredensial tersebut.",
    unableCreateAccount: "Tidak dapat membuat akun dengan data tersebut.",
    unableReset: "Gagal mengirim tautan atur ulang.",
    unableUpdatePassword: "Gagal memperbarui kata sandi.",
  },
  shell: {
    dashboard: "Dasbor",
    brands: "Brand",
    workspace: "Workspace",
    workspaces: "Daftar Workspace",
    noWorkspace: "Belum Ada Workspace",
    noWorkspacesYet: "Belum ada workspace",
    createWorkspace: "Buat Workspace",
    newWorkspace: "Workspace Baru",
    profile: "Profil",
    signOut: "Keluar",
    expandSidebar: "Perluas sidebar",
    minimizeSidebar: "Perkecil sidebar",
    openNav: "Buka navigasi",
    closeNav: "Tutup navigasi",
    selectWorkspace: "Pilih Workspace",
  },
  dialogs: {
    newWorkspaceTitle: "Workspace Baru",
    newWorkspaceDesc:
      "Buat workspace terpisah untuk brand dan anggota tim.",
    workspaceNameLabel: "Nama Workspace",
    workspacePlaceholder: "Agensi Kreatif Nusantara",
    profileTitle: "Profil",
    profileDesc: "Kelola nama tampilan akun Anda.",
    emailLabel: "Email",
    fullNameLabel: "Nama Lengkap",
  },
  dashboard: {
    title: "Dasbor",
    pendingInvitations: "Undangan Workspace Menunggu",
    rolePrefix: "Peran",
    emptyTitle: "Buat workspace pertama Anda",
    emptyDesc:
      "Workspace memisahkan aset brand, anggota tim, dan proyek carousel.",
    activeWorkspace: "Workspace Aktif",
    planLabel: "Paket",
    teamMembers: "Anggota Tim",
    activeSeats: "Kursi workspace aktif",
    workspacesLabel: "Workspace",
    accessibleAccounts: "Akun yang dapat diakses",
    workspaceMembers: "Anggota Workspace",
    manageTeam: "Kelola Tim",
    colMember: "Anggota",
    colEmail: "Email",
    colRole: "Peran",
    colJoined: "Bergabung",
  },
  settings: {
    title: "Pengaturan Workspace",
    noWorkspaceTitle: "Belum ada workspace aktif",
    noWorkspaceDesc: "Buat workspace untuk mengelola anggota dan peran.",
    general: "Umum",
    workspaceName: "Nama Workspace",
    saveChanges: "Simpan Perubahan",
    workspaceUpdated: "Workspace diperbarui.",
    membersCount: (count) => `Anggota (${count})`,
    addMember: "Tambah Anggota",
    colName: "Nama",
    colEmail: "Email",
    colRole: "Peran",
    colAction: "Aksi",
    pendingInvitationsCount: (count) => `Undangan Menunggu (${count})`,
    colExpires: "Kedaluwarsa",
    rolePermissions: "Hak Akses Peran",
    colAccessScope: "Ruang Lingkup Akses",
    deleteWorkspace: "Hapus Workspace",
    deleteWorkspaceDesc:
      "Menghapus workspace ini dan seluruh keanggotaan secara permanen.",
    inviteTitle: "Tambah Anggota Workspace",
    inviteDesc: "Undang anggota tim via email dan tentukan peran workspace.",
    inviteEmailPlaceholder: "rekan@perusahaan.com",
    adding: "Menambahkan...",
    memberAdded: "Anggota ditambahkan ke workspace.",
    invitationCreated: "Undangan dibuat.",
    removeTitle: "Hapus Anggota",
    removeDesc: (name, wsName) => `Hapus ${name} dari ${wsName}?`,
    deleteTitle: (wsName) => `Hapus ${wsName}`,
    deleteDesc:
      "Tindakan ini menghapus workspace secara permanen dan tidak dapat dibatalkan.",
    thisMember: "anggota ini",
  },
  brands: {
    title: "Brand",
    newTitle: "Brand Baru",
    detailTitle: "Profil Brand",
    newBrand: "Brand Baru",
    searchPlaceholder: "Cari brand...",
    emptyTitle: "Belum ada brand",
    emptyDesc:
      "Buat brand untuk menyimpan Brand DNA, warna, font, dan aset.",
    noMatches: "Tidak ada brand yang cocok.",
    noWorkspaceDesc: "Buat workspace terlebih dahulu sebelum menambah brand.",
    colBrand: "Brand",
    colIndustry: "Industri",
    colStatus: "Status",
    colUpdated: "Diperbarui",
    identitySection: "Identitas",
    brandName: "Nama Brand",
    brandNamePlaceholder: "Kopi Senja",
    industry: "Industri",
    industryPlaceholder: "Makanan & Minuman",
    description: "Deskripsi",
    descriptionPlaceholder: "Ringkasan posisi brand",
    starterPalette: "Palet Awal",
    primaryColor: "Utama",
    secondaryColor: "Sekunder",
    textColor: "Teks",
    starterTypography: "Tipografi Awal",
    headingFont: "Font Judul",
    bodyFont: "Font Isi",
    tabDna: "Brand DNA",
    tabPalette: "Warna & Font",
    tabAssets: "Aset",
    tabReferences: "Referensi",
    personality: "Kepribadian",
    personalityPlaceholder: "Hangat, modern, editorial",
    positioning: "Positioning",
    positioningPlaceholder: "Kopi artisan untuk profesional kreatif",
    audience: "Target Audiens",
    audiencePlaceholder: "Profesional muda usia 24–38",
    tone: "Gaya Bahasa",
    tonePlaceholder: "Ringkas, tegas, minimalis",
    visualRules: "Aturan Visual",
    visualRulesPlaceholder: "Ruang kosong lapang, kontras jelas",
    forbiddenElements: "Elemen Dilarang",
    forbiddenPlaceholder: "Gradien neon, badge menumpuk",
    layoutPreferences: "Preferensi Tata Letak",
    layoutPlaceholder: "Grid editorial, hierarki judul tegas",
    imageDirection: "Arahan Visual",
    imageDirectionPlaceholder: "Fotografi cahaya alami",
    savedNotice: "Perubahan disimpan.",
    colorsTitle: "Palet Warna",
    colorName: "Nama",
    colorNamePlaceholder: "Biru Utama",
    colorHex: "Hex",
    colorRole: "Peran",
    addColor: "Tambah Warna",
    noColors: "Belum ada warna.",
    fontsTitle: "Tipografi",
    fontFamily: "Nama Font",
    fontFamilyPlaceholder: "Plus Jakarta Sans",
    fontRole: "Peran",
    fontWeights: "Ketebalan",
    fontFileOptional: "File Font (Opsional)",
    noLinkedFile: "Font Sistem / Web",
    addFont: "Tambah Font",
    noFonts: "Belum ada font.",
    assetsTitle: "Aset Brand",
    assetType: "Jenis",
    assetFile: "File",
    assetAlt: "Label / Teks Alt",
    assetAltPlaceholder: "Logo horizontal utama",
    assetConstraints: "Gambar: PNG/JPG/WEBP/SVG maks 10 MB · Font: WOFF2/TTF/OTF maks 5 MB",
    noAssets: "Belum ada aset diunggah.",
    referencesTitle: "Referensi Visual",
    referenceType: "Jenis",
    linkedAsset: "Tautan Aset",
    noAssetLink: "Catatan saja",
    referenceNotes: "Catatan",
    referenceNotesPlaceholder: "Jaga rata kiri judul tetap konsisten",
    addReference: "Tambah Referensi",
    noReferences: "Belum ada referensi.",
    deleteBrandTitle: (name) => `Hapus ${name}`,
    deleteBrandDesc:
      "Menghapus brand, Brand DNA, aset, dan referensi secara permanen.",
    deleteAssetTitle: "Hapus Aset",
    deleteAssetDesc: "Menghapus file ini dari penyimpanan dan pustaka brand.",
    readOnlyNotice: "Akses baca saja untuk peran workspace Anda.",
    statuses: {
      draft: "Draf",
      approved: "Disetujui",
      archived: "Diarsipkan",
    },
    colorRoles: {
      primary: "Utama",
      secondary: "Sekunder",
      accent: "Aksen",
      background: "Latar",
      text: "Teks",
      neutral: "Netral",
    },
    fontRoles: {
      heading: "Judul",
      body: "Isi",
      accent: "Aksen",
    },
    assetTypes: {
      logo: "Logo",
      photo: "Foto",
      pattern: "Pola",
      icon: "Ikon",
      font: "Font",
    },
    referenceTypes: {
      liked: "Disukai",
      disliked: "Dihindari",
      mandatory: "Wajib",
    },
  },
  roles: {
    owner: "Pemilik",
    admin: "Admin",
    designer: "Desainer",
    content_creator: "Kreator Konten",
    client: "Klien",
  },
  roleCapabilities: {
    owner: "Akses penuh workspace, anggota, brand, proyek, pengaturan",
    admin: "Kelola brand, proyek, aset, dan anggota non-pemilik",
    designer: "Lihat brand, kelola proyek, edit canvas, ekspor",
    content_creator: "Kelola brief dan copywriting",
    client: "Pratinjau proyek dibagikan, komentar, persetujuan terbatas",
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return locale === "id" ? ID : EN;
}
