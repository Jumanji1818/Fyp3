import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Organization,
  OrganizationType,
  Department,
  User,
  Category,
  VendorProfile,
  PurchaseRequest,
  Tender,
  Bid,
  PurchaseOrder,
  PaymentRecord,
  DeliveryRecord,
  BudgetChange,
  NotificationItem,
  AuditLogEntry,
  OrganizationSettings,
  UserRole,
  RequestStatus,
  TenderStatus,
} from '../types';
import {
  INITIAL_ORGANIZATIONS,
  INITIAL_SETTINGS,
  INITIAL_DEPARTMENTS,
  INITIAL_CATEGORIES,
  INITIAL_USERS,
  INITIAL_VENDORS,
  INITIAL_REQUESTS,
  INITIAL_TENDERS,
  INITIAL_BIDS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_DELIVERIES,
  INITIAL_PAYMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
} from '../data/seedData';
import {
  hashPassword,
  verifyPassword,
  validateStrongPassword,
  DEMO_DEFAULT_HASH,
} from '../utils/authHash';

interface AppContextType {
  organizations: Organization[];
  currentOrganization: Organization;
  switchOrganization: (orgId: string) => void;
  registerOrganization: (
    orgData: {
      name: string;
      type: OrganizationType;
      industry: string;
      address: string;
      phone: string;
      email: string;
      approvalThreshold?: number;
      initialBudget?: number;
      currency?: string;
    },
    adminData: {
      fullName: string;
      email: string;
      phone: string;
      password: string;
    }
  ) => { success: boolean; error?: string; organization?: Organization; adminUser?: User };
  provisionStaffUser: (data: {
    fullName: string;
    email: string;
    phone: string;
    role: UserRole;
    departmentId?: string;
    tempPassword?: string;
    mustChangePassword?: boolean;
  }) => { success: boolean; user?: User; tempPassword: string; error?: string };
  changeTempPassword: (userId: string, currentPass: string, newPass: string) => { success: boolean; error?: string };
  resetPasswordWithSecurity: (email: string, answer: string, newPass: string) => { success: boolean; error?: string };
  settings: OrganizationSettings;
  updateSettings: (newSettings: Partial<OrganizationSettings>) => void;
  departments: Department[];
  users: User[];
  categories: Category[];
  vendors: VendorProfile[];
  requests: PurchaseRequest[];
  tenders: Tender[];
  bids: Bid[];
  purchaseOrders: PurchaseOrder[];
  deliveries: DeliveryRecord[];
  payments: PaymentRecord[];
  budgetChanges: BudgetChange[];
  notifications: NotificationItem[];
  auditLogs: AuditLogEntry[];
  currentUser: User | null;
  isAuthenticated: boolean;
  theme: 'dark' | 'light' | 'system';
  setTheme: (t: 'dark' | 'light' | 'system') => void;
  toggleTheme: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (c: boolean) => void;
  login: (email: string, pass: string) => { success: boolean; error?: string; mustChangePassword?: boolean };
  logout: () => void;
  switchUser: (userId: string) => void;
  loadDemoData: () => void;
  resetAllData: () => void;
  registerVendor: (vendor: VendorProfile, user: User) => void;
  registerStaffUser: (user: User) => void;
  updateUserProfile: (updates: { fullName?: string; email?: string; phone?: string }) => void;
  addAuditLog: (action: string, recordReference: string, oldValue?: string, newValue?: string, details?: string) => void;
  addNotification: (notif: Omit<NotificationItem, 'id' | 'read' | 'createdAt'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  createRequest: (data: Partial<PurchaseRequest>) => PurchaseRequest;
  updateRequest: (id: string, data: Partial<PurchaseRequest>) => void;
  approveRequest: (id: string, reviewerComment?: string) => void;
  returnRequest: (id: string, comment: string) => void;
  rejectRequest: (id: string, reason: string) => void;
  createTenderFromRequest: (requestId: string, tenderData: Partial<Tender>) => Tender;
  extendTenderDeadline: (tenderId: string, newDate: string, reason: string) => void;
  cancelTender: (tenderId: string, reason: string) => void;
  submitBid: (tenderId: string, bidData: Partial<Bid>) => Bid;
  evaluateCompliance: (bidId: string, passed: boolean, reason?: string) => void;
  evaluateTechnical: (bidId: string, score: number, comments: string) => void;
  calculateVendorRecommendations: (tenderId: string) => Bid[];
  awardTender: (tenderId: string, winningBidId: string, justification?: string) => { requiresAuthority: boolean; poCreated?: PurchaseOrder };
  submitAwardRecommendation: (tenderId: string, winningBidId: string, justification?: string) => void;
  approveTenderBudgetOverride: (tenderId: string, overrideReason: string) => void;
  requestTenderBudgetOverride: (tenderId: string, bidAmount: number, shortfall: number) => void;
  authorityApproveAward: (tenderId: string, approved: boolean, reason?: string) => void;
  overrideBudgetAndAward: (tenderId: string, winningBidId: string, overrideReason: string) => void;
  acknowledgePO: (poId: string) => void;
  dispatchDelivery: (poId: string, notes: string) => void;
  receiveDelivery: (
    poId: string,
    itemsReceived: DeliveryRecord['itemsReceived'],
    decision?: 'Approved' | 'Rejected',
    rejectionReason?: string
  ) => void;
  recordPayment: (paymentData: Omit<PaymentRecord, 'id' | 'voucherNumber' | 'recordedByUserId' | 'recordedByName'>) => PaymentRecord;
  toggleMyVendor: (vendorId: string) => void;
  updateVendorStatus: (vendorId: string, status: VendorProfile['status'], reason?: string, targetOrgId?: string) => void;
  getVendorEffectiveStatus: (vendor: VendorProfile, orgId?: string) => { status: VendorProfile['status']; reason?: string };
  adjustBudget: (deptId: string, newBudget: number, reason: string) => void;
  addDepartment: (name: string, annualBudget: number, organizationId?: string) => Department;
  deleteDepartment: (departmentId: string) => { success: boolean; message?: string };
  updateDepartment: (departmentId: string, name: string, annualBudget?: number) => void;
  adminApproveUser: (userId: string, role: UserRole, deptId?: string) => void;
  adminUpdateUserRole: (userId: string, newRole: UserRole, deptId?: string) => void;
  adminToggleUserStatus: (userId: string) => void;
  adminResetUserPassword: (userId: string) => { success: boolean; tempPassword: string };
  addCategory: (name: string, subcategories: string[]) => void;
  deactivateCategory: (categoryId: string) => void;
  reactivateCategory: (categoryId: string) => void;
  editCategory: (categoryId: string, newName: string, newSubcategories: string[]) => void;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  toggleMenu: () => void;
  exportDatabaseJson: () => string;
  importDatabaseJson: (jsonStr: string) => boolean;
  inactivityModalOpen: boolean;
  resetInactivityTimer: () => void;
  staySignedIn: () => void;
  celebrationOpen: boolean;
  setCelebrationOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_PREFIX = 'procura_app_v1_';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Primary state loaded from LocalStorage if present, else initial seed data
  const [organizations, setOrganizations] = useState<Organization[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'organizations');
    return saved ? JSON.parse(saved) : INITIAL_ORGANIZATIONS;
  });

  const [currentOrganization, setCurrentOrganization] = useState<Organization>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'current_organization');
    const orgs: Organization[] = (() => {
      const savedOrgs = localStorage.getItem(STORAGE_PREFIX + 'organizations');
      return savedOrgs ? JSON.parse(savedOrgs) : INITIAL_ORGANIZATIONS;
    })();
    const savedUserStr = localStorage.getItem(STORAGE_PREFIX + 'current_user');
    if (savedUserStr) {
      try {
        const u = JSON.parse(savedUserStr);
        if (u?.organizationId) {
          const match = orgs.find((o) => o.id === u.organizationId);
          if (match) return match;
        }
      } catch {
        // fallback
      }
    }
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const match = orgs.find((o) => o.id === parsed.id);
        if (match) return match;
        return parsed;
      } catch {
        return orgs[0] || INITIAL_ORGANIZATIONS[0];
      }
    }
    return orgs[0] || INITIAL_ORGANIZATIONS[0];
  });

  const [settings, setSettings] = useState<OrganizationSettings>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'settings');
    const base = saved ? JSON.parse(saved) : INITIAL_SETTINGS;
    // ensure settings reflect currentOrganization
    return {
      ...base,
      name: currentOrganization?.name || base.name,
      approvalThreshold: currentOrganization?.approvalThreshold || base.approvalThreshold,
      currency: currentOrganization?.currency || base.currency || '₦',
      address: currentOrganization?.address || base.address,
      phone: currentOrganization?.phone || base.phone,
      email: currentOrganization?.email || base.email,
    };
  });

  const [departments, setDepartments] = useState<Department[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'departments');
    const list: Department[] = saved ? JSON.parse(saved) : INITIAL_DEPARTMENTS;
    return list.map((d) => (d.organizationId ? d : { ...d, organizationId: 'org-emerald' }));
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'users');
    const list: User[] = saved ? JSON.parse(saved) : INITIAL_USERS;
    return list.map((u) => {
      const orgFixed = u.organizationId || u.role === 'Vendor' ? u : { ...u, organizationId: 'org-emerald' };
      return orgFixed.passwordHash ? orgFixed : { ...orgFixed, passwordHash: DEMO_DEFAULT_HASH };
    });
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'categories');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [vendors, setVendors] = useState<VendorProfile[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'vendors');
    return saved ? JSON.parse(saved) : INITIAL_VENDORS;
  });

  const [requests, setRequests] = useState<PurchaseRequest[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'requests');
    const list: PurchaseRequest[] = saved ? JSON.parse(saved) : INITIAL_REQUESTS;
    return list.map((r) => (r.organizationId ? r : { ...r, organizationId: 'org-emerald' }));
  });

  const [tenders, setTenders] = useState<Tender[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'tenders');
    const list: Tender[] = saved ? JSON.parse(saved) : INITIAL_TENDERS;
    return list.map((t) => (t.organizationId ? t : { ...t, organizationId: 'org-emerald' }));
  });

  const [bids, setBids] = useState<Bid[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'bids');
    return saved ? JSON.parse(saved) : INITIAL_BIDS;
  });

  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'deliveries');
    const list: DeliveryRecord[] = saved ? JSON.parse(saved) : INITIAL_DELIVERIES;
    return list.map((del) => {
      const allRejected =
        del.itemsReceived &&
        del.itemsReceived.length > 0 &&
        del.itemsReceived.every((i) => i.status === 'Rejected');
      const isRejected = del.outcome === 'Rejected' || allRejected;
      return {
        ...del,
        organizationId: del.organizationId || 'org-emerald',
        outcome: isRejected ? ('Rejected' as const) : del.outcome || 'Approved',
      };
    });
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'pos');
    const list: PurchaseOrder[] = saved ? JSON.parse(saved) : INITIAL_PURCHASE_ORDERS;
    const savedDeliveries = localStorage.getItem(STORAGE_PREFIX + 'deliveries');
    const delList: DeliveryRecord[] = savedDeliveries ? JSON.parse(savedDeliveries) : INITIAL_DELIVERIES;
    const rejectedPOIds = new Set(
      delList
        .filter((d) => d.outcome === 'Rejected' || (d.itemsReceived && d.itemsReceived.every((it) => it.status === 'Rejected')))
        .map((d) => d.purchaseOrderId)
    );

    return list.map((po) => {
      const base = po.organizationId ? po : { ...po, organizationId: 'org-emerald' };
      if (rejectedPOIds.has(po.id) && base.status !== 'Rejected') {
        return { ...base, status: 'Rejected' as const };
      }
      return base;
    });
  });

  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'payments');
    const list: PaymentRecord[] = saved ? JSON.parse(saved) : INITIAL_PAYMENTS;
    return list.map((pay) => (pay.organizationId ? pay : { ...pay, organizationId: 'org-emerald' }));
  });

  const [budgetChanges, setBudgetChanges] = useState<BudgetChange[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'budget_changes');
    return saved ? JSON.parse(saved) : [];
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'notifications');
    const list: NotificationItem[] = saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    return list.map((n) =>
      n.organizationId || n.forRole === 'Vendor' ? n : { ...n, organizationId: 'org-emerald' }
    );
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'audit_logs');
    const list: AuditLogEntry[] = saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    return list.map((a) => (a.organizationId ? a : { ...a, organizationId: 'org-emerald' }));
  });

  // Current session - Start on Welcome/Login screen unless explicitly authenticated in session
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [theme, setThemeState] = useState<'dark' | 'light' | 'system'>(() => {
    return settings.theme || 'dark';
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [inactivityModalOpen, setInactivityModalOpen] = useState<boolean>(false);
  const [celebrationOpen, setCelebrationOpen] = useState<boolean>(false);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'organizations', JSON.stringify(organizations));
  }, [organizations]);
  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'current_organization', JSON.stringify(currentOrganization));
    setSettings((prev) => ({
      ...prev,
      name: currentOrganization.name,
      type:
        currentOrganization.type === 'sole_proprietorship'
          ? 'Sole Proprietor / Small Business'
          : currentOrganization.type === 'mega_corporation'
          ? 'Mega Corporation / Public Parastatal'
          : 'Enterprise / Corporate',
      approvalThreshold: currentOrganization.approvalThreshold,
      currency: currentOrganization.currency || '₦',
      address: currentOrganization.address,
      phone: currentOrganization.phone,
      email: currentOrganization.email,
    }));
  }, [currentOrganization]);
  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'settings', JSON.stringify(settings));
  }, [settings]);
  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'departments', JSON.stringify(departments));
  }, [departments]);
  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'users', JSON.stringify(users));
  }, [users]);
  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'categories', JSON.stringify(categories));
  }, [categories]);
  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'vendors', JSON.stringify(vendors));
  }, [vendors]);
  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'requests', JSON.stringify(requests));
  }, [requests]);
  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'tenders', JSON.stringify(tenders));
  }, [tenders]);
  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'bids', JSON.stringify(bids));
  }, [bids]);
  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'pos', JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);
  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'deliveries', JSON.stringify(deliveries));
  }, [deliveries]);
  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'payments', JSON.stringify(payments));
  }, [payments]);
  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'budget_changes', JSON.stringify(budgetChanges));
  }, [budgetChanges]);
  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'notifications', JSON.stringify(notifications));
  }, [notifications]);
  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);
  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem(STORAGE_PREFIX + 'current_user', JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem(STORAGE_PREFIX + 'current_user');
      localStorage.removeItem(STORAGE_PREFIX + 'current_user');
    }
  }, [currentUser]);

  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const toggleMenu = () => setMenuOpen((prev) => !prev);

  // Apply theme to document and body elements
  useEffect(() => {
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.remove('light');
      document.body.classList.remove('light');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.add('light');
      document.body.classList.add('light');
      document.documentElement.style.colorScheme = 'light';
    }
  }, [theme]);

  const setTheme = (newTheme: 'dark' | 'light' | 'system') => {
    setThemeState(newTheme);
    setSettings((prev) => ({ ...prev, theme: newTheme }));
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  const updateSettings = (newSettings: Partial<OrganizationSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      return updated;
    });
    if (newSettings.theme) {
      setThemeState(newSettings.theme);
    }
    // Keep currentOrganization and organizations list in sync if org attributes change
    if (newSettings.name || newSettings.address || newSettings.phone || newSettings.email || newSettings.approvalThreshold !== undefined || newSettings.currency) {
      setCurrentOrganization((prev) => {
        const updatedOrg: Organization = {
          ...prev,
          name: newSettings.name ?? prev.name,
          address: newSettings.address ?? prev.address,
          phone: newSettings.phone ?? prev.phone,
          email: newSettings.email ?? prev.email,
          currency: newSettings.currency ?? prev.currency,
          approvalThreshold: newSettings.approvalThreshold ?? prev.approvalThreshold,
        };
        setOrganizations((allOrgs) =>
          allOrgs.map((o) => (o.id === prev.id ? updatedOrg : o))
        );
        return updatedOrg;
      });
    }
  };

  // Audit Log helper
  const addAuditLog = useCallback(
    (action: string, recordReference: string, oldValue?: string, newValue?: string, details?: string) => {
      const newEntry: AuditLogEntry = {
        id: 'aud-' + Date.now(),
        organizationId: currentOrganization?.id,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'system',
        userName: currentUser?.fullName || 'System',
        role: currentUser?.role || 'System',
        action,
        recordReference,
        oldValue,
        newValue,
        details,
      };
      setAuditLogs((prev) => [newEntry, ...prev]);
    },
    [currentUser, currentOrganization?.id]
  );

  // Reference sequence generator (prevents collisions after historical seed records)
  const getNextReference = (prefix: string, existingRefs: string[]): string => {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escaped}-(\\d+)$`);
    let maxNum = 0;
    existingRefs.forEach((r) => {
      const match = r.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `${prefix}-${(maxNum + 1).toString().padStart(4, '0')}`;
  };

  // Notification helper
  const addNotification = useCallback(
    (notif: Omit<NotificationItem, 'id' | 'read' | 'createdAt'>) => {
      const newItem: NotificationItem = {
        ...notif,
        organizationId:
          notif.organizationId ?? (notif.forRole === 'Vendor' ? undefined : currentOrganization?.id),
        id: 'notif-' + Date.now() + Math.random().toString(36).substring(2, 6),
        read: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [newItem, ...prev]);
    },
    [currentOrganization?.id]
  );

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Auth, Organization & Staff Provisioning
  const login = (
    email: string,
    password?: string
  ): { success: boolean; error?: string; mustChangePassword?: boolean } => {
    // Search exact email or handle common demo aliases
    const cleanEmail = email.trim().toLowerCase();
    let found = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!found) {
      if (cleanEmail === 'ibrahim@emerald.ng' || cleanEmail === 'admin@emerald.ng') {
        found = users.find((u) => u.id === 'user-admin') || users.find((u) => u.email.includes('admin@emerald'));
      } else if (cleanEmail === 'procurement@emerald.ng' || cleanEmail === 'chidiebere@emerald.ng') {
        found = users.find((u) => u.id === 'user-proc') || users.find((u) => u.email.includes('chidiebere'));
      } else if (cleanEmail === 'finance@emerald.ng' || cleanEmail === 'folake@emerald.ng') {
        found = users.find((u) => u.id === 'user-fin') || users.find((u) => u.email.includes('folake'));
      } else if (cleanEmail === 'director@emerald.ng' || cleanEmail === 'babatunde@emerald.ng') {
        found = users.find((u) => u.id === 'user-auth') || users.find((u) => u.email.includes('babatunde'));
      } else if (cleanEmail === 'hussain@husabdesigns.ng' || cleanEmail === 'hussain@husabdesign.ng') {
        found = users.find((u) => u.id === 'user-husab-admin') || users.find((u) => u.email.includes('hussain'));
      } else if (cleanEmail === 'bids@apexengineering.ng' || cleanEmail === 'musa@apexholdings.ng') {
        found = users.find((u) => u.id === 'user-vendor1') || users.find((u) => u.email.includes('apex'));
      }
    }
    if (found) {
      if (found.status === 'Pending') {
        return { success: false, error: 'Your account is pending administrator approval.' };
      }
      if (found.status === 'Deactivated') {
        return { success: false, error: 'Your account has been deactivated. Contact Admin.' };
      }

      // Real password verification against stored SHA-256 hash or active temporary password
      const supplied = password || '';
      const validTemp = !!(found.mustChangePassword && found.tempPassword && supplied === found.tempPassword);
      const validHash = verifyPassword(supplied, found.passwordHash);
      if (!validTemp && !validHash) {
        addAuditLog(
          'Failed Login Attempt',
          found.email,
          undefined,
          'Invalid Password',
          `Rejected authentication attempt for ${found.fullName}.`
        );
        return { success: false, error: 'Incorrect email or password.' };
      }

      // If user belongs to an organization, switch active organization to theirs
      let targetOrg = currentOrganization;
      if (found.organizationId) {
        const org = organizations.find((o) => o.id === found.organizationId);
        if (org) {
          targetOrg = org;
          setCurrentOrganization(org);
          setSettings((prev) => ({
            ...prev,
            name: org.name,
            type:
              org.type === 'sole_proprietorship'
                ? 'Sole Proprietor / Small Business'
                : org.type === 'mega_corporation'
                ? 'Mega Corporation / Public Parastatal'
                : 'Enterprise / Corporate',
            approvalThreshold: org.approvalThreshold,
            currency: org.currency || '₦',
            address: org.address,
            phone: org.phone,
            email: org.email,
          }));
        }
      }

      setCurrentUser(found);
      addAuditLog(
        'User Login',
        'AUTH',
        undefined,
        `Logged in as ${found.role}`,
        `User ${found.fullName} authenticated successfully in ${targetOrg.name}.`
      );

      return {
        success: true,
        mustChangePassword: !!found.mustChangePassword,
      };
    }
    return { success: false, error: 'Incorrect email or password.' };
  };

  const registerOrganization = (
    orgData: {
      name: string;
      type: OrganizationType;
      industry: string;
      address: string;
      phone: string;
      email: string;
      approvalThreshold?: number;
      initialBudget?: number;
      currency?: string;
    },
    adminData: {
      fullName: string;
      email: string;
      phone: string;
      password: string;
    }
  ): { success: boolean; error?: string; organization?: Organization; adminUser?: User } => {
    if (users.some((u) => u.email.toLowerCase() === adminData.email.trim().toLowerCase())) {
      return { success: false, error: 'An account with this administrator email already exists.' };
    }
    const orgId = 'org-' + Date.now();
    const threshold =
      orgData.approvalThreshold ||
      (orgData.type === 'sole_proprietorship'
        ? 500000
        : orgData.type === 'mega_corporation'
        ? 50000000
        : 5000000);

    const newOrg: Organization = {
      id: orgId,
      name: orgData.name,
      type: orgData.type,
      industry: orgData.industry,
      address: orgData.address,
      phone: orgData.phone,
      email: orgData.email,
      approvalThreshold: threshold,
      currency: orgData.currency || '₦',
      createdAt: new Date().toISOString(),
    };

    // Auto-seed initial departments suited for the business type
    let newDepts: Department[] = [];
    if (orgData.type === 'sole_proprietorship') {
      newDepts = [
        {
          id: `dept-${orgId}-main`,
          organizationId: orgId,
          name: 'Studio & Production Operations',
          annualBudget: orgData.initialBudget || 20000000,
          spent: 0,
          committed: 0,
        },
      ];
    } else if (orgData.type === 'mega_corporation') {
      newDepts = [
        {
          id: `dept-${orgId}-ops`,
          organizationId: orgId,
          name: 'Division Operations & Infrastructure',
          annualBudget: orgData.initialBudget ? Math.round(orgData.initialBudget * 0.6) : 300000000,
          spent: 0,
          committed: 0,
        },
        {
          id: `dept-${orgId}-fin`,
          organizationId: orgId,
          name: 'Corporate Finance & Treasury',
          annualBudget: orgData.initialBudget ? Math.round(orgData.initialBudget * 0.25) : 150000000,
          spent: 0,
          committed: 0,
        },
        {
          id: `dept-${orgId}-proc`,
          organizationId: orgId,
          name: 'Strategic Procurement & Contracts',
          annualBudget: orgData.initialBudget ? Math.round(orgData.initialBudget * 0.15) : 80000000,
          spent: 0,
          committed: 0,
        },
      ];
    } else {
      newDepts = [
        {
          id: `dept-${orgId}-ops`,
          organizationId: orgId,
          name: 'Operations & Procurement',
          annualBudget: orgData.initialBudget ? Math.round(orgData.initialBudget * 0.6) : 50000000,
          spent: 0,
          committed: 0,
        },
        {
          id: `dept-${orgId}-fin`,
          organizationId: orgId,
          name: 'Finance & Accounts',
          annualBudget: orgData.initialBudget ? Math.round(orgData.initialBudget * 0.4) : 30000000,
          spent: 0,
          committed: 0,
        },
      ];
    }

    const adminUser: User = {
      id: 'user-' + Date.now(),
      organizationId: orgId,
      fullName: adminData.fullName,
      email: adminData.email.trim(),
      phone: adminData.phone,
      role: 'Organization Admin',
      status: 'Active',
      avatar: adminData.fullName.substring(0, 2).toUpperCase(),
      passwordHash: hashPassword(adminData.password),
      createdAt: new Date().toISOString(),
    };

    setOrganizations((prev) => [newOrg, ...prev]);
    setDepartments((prev) => [...newDepts, ...prev]);
    setUsers((prev) => [adminUser, ...prev]);
    setCurrentOrganization(newOrg);
    setCurrentUser(adminUser);
    setSettings((prev) => ({
      ...prev,
      name: newOrg.name,
      type:
        newOrg.type === 'sole_proprietorship'
          ? 'Sole Proprietor / Small Business'
          : newOrg.type === 'mega_corporation'
          ? 'Mega Corporation / Public Parastatal'
          : 'Enterprise / Corporate',
      approvalThreshold: newOrg.approvalThreshold,
      currency: newOrg.currency || '₦',
      address: newOrg.address,
      phone: newOrg.phone,
      email: newOrg.email,
    }));

    addAuditLog(
      'Registered New Organization',
      newOrg.name,
      undefined,
      newOrg.type,
      `New organization registered by ${adminUser.fullName}. Type: ${newOrg.type}, Industry: ${newOrg.industry}`
    );

    return { success: true, organization: newOrg, adminUser };
  };

  const switchOrganization = (orgId: string) => {
    const target = organizations.find((o) => o.id === orgId);
    if (!target) return;
    setCurrentOrganization(target);
    setSettings((prev) => ({
      ...prev,
      name: target.name,
      type:
        target.type === 'sole_proprietorship'
          ? 'Sole Proprietor / Small Business'
          : target.type === 'mega_corporation'
          ? 'Mega Corporation / Public Parastatal'
          : 'Enterprise / Corporate',
      approvalThreshold: target.approvalThreshold,
      currency: target.currency || '₦',
      address: target.address,
      phone: target.phone,
      email: target.email,
    }));

    // If current logged-in user belongs to another organization and is not a global Vendor,
    // switch to the admin user of the target organization for seamless testing!
    if (currentUser?.role !== 'Vendor') {
      const targetAdmin =
        users.find((u) => u.organizationId === orgId && u.role === 'Organization Admin') ||
        users.find((u) => u.organizationId === orgId && u.role !== 'Vendor');
      if (targetAdmin) {
        setCurrentUser(targetAdmin);
      }
    }

    addAuditLog(
      'Organization Context Switched',
      target.name,
      undefined,
      target.type,
      `Active context switched to ${target.name}`
    );
  };

  const provisionStaffUser = (data: {
    fullName: string;
    email: string;
    phone: string;
    role: UserRole;
    departmentId?: string;
    tempPassword?: string;
    mustChangePassword?: boolean;
  }) => {
    const existing = users.find((u) => u.email.toLowerCase() === data.email.toLowerCase());
    if (existing) {
      return {
        success: false,
        tempPassword: '',
        error: 'A user account with this email address already exists.',
      };
    }

    const tempPass = data.tempPassword || `Procura#${Math.floor(1000 + Math.random() * 9000)}`;

    const newUser: User = {
      id: 'user-' + Date.now(),
      organizationId: currentOrganization.id,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      role: data.role,
      departmentId:
        data.departmentId ||
        departments.find((d) => d.organizationId === currentOrganization.id)?.id,
      status: 'Active',
      avatar: data.fullName.substring(0, 2).toUpperCase(),
      mustChangePassword: data.mustChangePassword !== false,
      tempPassword: tempPass,
      passwordHash: hashPassword(tempPass),
      createdAt: new Date().toISOString(),
    };

    setUsers((prev) => [newUser, ...prev]);
    addAuditLog(
      'Provisioned Staff Account',
      newUser.fullName,
      undefined,
      newUser.role,
      `Provisioned for ${currentOrganization.name} with temporary login credentials. Temporary password must be changed on first login.`
    );

    return { success: true, user: newUser, tempPassword: tempPass };
  };

  const changeTempPassword = (userId: string, currentPass: string, newPass: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, error: 'User account not found.' };

    const validCurrent =
      (target.tempPassword && currentPass === target.tempPassword) ||
      verifyPassword(currentPass, target.passwordHash);
    if (!validCurrent) {
      return { success: false, error: 'Current temporary password is incorrect.' };
    }

    const strength = validateStrongPassword(newPass);
    if (!strength.valid) {
      return { success: false, error: strength.message || 'Password does not meet complexity requirements.' };
    }

    if (newPass === currentPass) {
      return { success: false, error: 'New password must be different from your temporary password.' };
    }

    const newHash = hashPassword(newPass);
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          return {
            ...u,
            mustChangePassword: false,
            tempPassword: undefined,
            passwordHash: newHash,
          };
        }
        return u;
      })
    );

    if (currentUser?.id === userId) {
      setCurrentUser((prev) =>
        prev ? { ...prev, mustChangePassword: false, tempPassword: undefined, passwordHash: newHash } : null
      );
    }

    addAuditLog(
      'Updated First-Login Password',
      target.fullName,
      'Temporary Password',
      'Permanent Password Set',
      'User verified temporary credentials and set a hashed permanent password.'
    );

    return { success: true };
  };

  const resetPasswordWithSecurity = (
    email: string,
    answer: string,
    newPass: string
  ): { success: boolean; error?: string } => {
    const target = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!target) {
      return { success: false, error: 'No account found with this email address.' };
    }

    if (
      target.securityAnswer &&
      answer.toLowerCase().trim() !== target.securityAnswer.toLowerCase().trim()
    ) {
      return { success: false, error: 'Incorrect answer to security question.' };
    }

    const strength = validateStrongPassword(newPass);
    if (!strength.valid) {
      return { success: false, error: strength.message || 'Password does not meet security policy.' };
    }

    const newHash = hashPassword(newPass);
    setUsers((prev) =>
      prev.map((u) =>
        u.id === target.id
          ? { ...u, passwordHash: newHash, mustChangePassword: false, tempPassword: undefined }
          : u
      )
    );

    addAuditLog(
      'Offline Password Reset',
      target.email,
      undefined,
      'Password Hash Updated',
      'Reset verified via security question.'
    );

    return { success: true };
  };

  const logout = () => {
    if (currentUser) {
      addAuditLog('User Logout', 'AUTH', `Role: ${currentUser.role}`, 'Logged Out', 'User ended session.');
    }
    setCurrentUser(null);
  };

  const switchUser = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
      addAuditLog('Switched User Session', 'SWITCH', undefined, `Switched to ${found.fullName} (${found.role})`);
    }
  };

  const registerVendor = (newVendor: VendorProfile, newUser: User) => {
    setVendors((prev) => [newVendor, ...prev]);
    setUsers((prev) => [newUser, ...prev]);
    setCurrentUser(newUser);
    addAuditLog(
      'Vendor Self-Registered',
      newVendor.businessName,
      undefined,
      'Status: Registered',
      `Categories: ${newVendor.categories.join(', ')}`
    );
    addNotification({
      organizationId: currentOrganization.id,
      forRole: 'Procurement Officer',
      title: 'New Vendor Registration',
      message: `${newVendor.businessName} registered under categories: ${newVendor.categories.join(', ')}.`,
      type: 'info',
    });
  };

  const registerStaffUser = (newUser: User) => {
    setUsers((prev) => [newUser, ...prev]);
    addAuditLog(
      'Staff Self-Registered (Pending)',
      newUser.fullName,
      undefined,
      'Status: Pending',
      `Awaiting Organization Admin role assignment in ${currentOrganization.name}.`
    );
    addNotification({
      organizationId: newUser.organizationId || currentOrganization.id,
      forRole: 'Organization Admin',
      title: 'New Staff Account Pending Approval',
      message: `${newUser.fullName} (${newUser.email}) registered and awaits role assignment.`,
      type: 'info',
    });
  };

  const updateUserProfile = (updates: { fullName?: string; email?: string; phone?: string }) => {
    if (!currentUser) return;
    const updatedUser: User = {
      ...currentUser,
      fullName: updates.fullName ?? currentUser.fullName,
      email: updates.email ?? currentUser.email,
      phone: updates.phone ?? currentUser.phone,
    };
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updatedUser : u)));
    setCurrentUser(updatedUser);
    addAuditLog('Updated User Profile', updatedUser.fullName, undefined, updatedUser.email);
  };

  const loadDemoData = () => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(STORAGE_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
    setOrganizations(INITIAL_ORGANIZATIONS);
    setCurrentOrganization(INITIAL_ORGANIZATIONS[0]);
    setSettings(INITIAL_SETTINGS);
    setDepartments(INITIAL_DEPARTMENTS);
    setCategories(INITIAL_CATEGORIES);
    setUsers(
      INITIAL_USERS.map((u) => (u.passwordHash ? u : { ...u, passwordHash: DEMO_DEFAULT_HASH }))
    );
    setVendors(INITIAL_VENDORS);
    setRequests(INITIAL_REQUESTS);
    setTenders(INITIAL_TENDERS);
    setBids(INITIAL_BIDS);
    setPurchaseOrders(INITIAL_PURCHASE_ORDERS);
    setDeliveries(INITIAL_DELIVERIES);
    setPayments(INITIAL_PAYMENTS);
    setBudgetChanges([]);
    setNotifications(INITIAL_NOTIFICATIONS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setCurrentUser(INITIAL_USERS[0]);
  };

  const resetAllData = () => {
    loadDemoData();
  };

  // Request Workflows
  const createRequest = (data: Partial<PurchaseRequest>): PurchaseRequest => {
    const isSole = currentOrganization.type === 'sole_proprietorship';
    const orgPrefix =
      currentOrganization.id === 'org-husab'
        ? 'REQ-HUSB'
        : currentOrganization.id === 'org-nnpc'
        ? 'REQ-NNPC'
        : 'REQ-2026';

    const ref = getNextReference(
      orgPrefix,
      requests.map((r) => r.referenceNumber)
    );

    const orgDepts = departments.filter((d) =>
      d.organizationId ? d.organizationId === currentOrganization.id : currentOrganization.id === 'org-emerald'
    );
    const assignedDeptId = data.departmentId || currentUser?.departmentId || orgDepts[0]?.id || 'dept-works';
    const assignedDept = departments.find((d) => d.id === assignedDeptId) || orgDepts[0];

    // Determine initial status: If explicitly supplied, use it; for sole proprietors, if not draft, default to direct approval
    const finalStatus: RequestStatus = data.status
      ? data.status
      : isSole
      ? 'Approved by Department'
      : 'Submitted';

    const isApproved = finalStatus === 'Approved by Department';

    const newReq: PurchaseRequest = {
      id: 'req-' + Date.now(),
      organizationId: currentOrganization.id,
      referenceNumber: ref,
      title: data.title || 'Untitled Request',
      departmentId: assignedDeptId,
      departmentName: assignedDept?.name || 'Operations',
      requesterId: currentUser?.id || 'unknown',
      requesterName: currentUser?.fullName || 'Requester',
      priority: data.priority || 'Normal',
      neededByDate: data.neededByDate || new Date().toISOString().split('T')[0],
      justification: data.justification || '',
      items: data.items || [],
      estimatedTotal: (data.items || []).reduce((acc, it) => acc + it.totalPrice, 0),
      status: finalStatus,
      reviewerId: isApproved ? currentUser?.id : undefined,
      reviewerName: isApproved ? currentUser?.fullName || (isSole ? 'Business Owner' : 'Administrator') : undefined,
      reviewComment: isApproved
        ? isSole
          ? 'Directly self-approved by Sole Proprietor / Business Owner'
          : 'Directly approved by Organization Administrator'
        : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setRequests((prev) => [newReq, ...prev]);

    if (isApproved) {
      addAuditLog(
        isSole ? 'Requisition Self-Approved' : 'Requisition Directly Authorized',
        ref,
        undefined,
        'Approved by Department',
        `Authorized by ${newReq.reviewerName}. Estimated total: ₦${newReq.estimatedTotal.toLocaleString()}`
      );
      addNotification({
        userId: newReq.requesterId,
        title: isSole ? 'Requisition Self-Approved' : 'Requisition Approved',
        message: `${ref} is authorized and ready for tender conversion or purchase order generation.`,
        type: 'success',
        recordType: 'request',
        recordId: newReq.id,
      });
      addNotification({
        forRole: 'Procurement Officer',
        title: 'Approved Requisition in Queue',
        message: `Requisition ${ref} (${newReq.title}) is ready for tender conversion.`,
        type: 'info',
        recordType: 'request',
        recordId: newReq.id,
      });
    } else {
      addAuditLog(
        'Created Purchase Request',
        ref,
        undefined,
        `Status: ${newReq.status}`,
        `Estimated total: ₦${newReq.estimatedTotal.toLocaleString()}`
      );

      if (newReq.status === 'Submitted') {
        if (isSole) {
          addNotification({
            userId: currentUser?.id,
            title: 'New Requisition Awaiting Sign-Off',
            message: `Your requisition ${ref} is saved and awaiting your approval sign-off.`,
            type: 'info',
            recordType: 'request',
            recordId: newReq.id,
          });
        } else {
          addNotification({
            forRole: 'Department Head',
            title: 'New Purchase Request Submitted',
            message: `${newReq.requesterName} submitted ${ref} (${newReq.title}).`,
            type: 'info',
            recordType: 'request',
            recordId: newReq.id,
          });
        }
      }
    }

    return newReq;
  };

  const updateRequest = (id: string, data: Partial<PurchaseRequest>) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, ...data, updatedAt: new Date().toISOString() };
          addAuditLog('Updated Request', r.referenceNumber, `Status: ${r.status}`, `Status: ${updated.status}`, `Updated fields in request`);
          return updated;
        }
        return r;
      })
    );
  };

  const approveRequest = (id: string, reviewerComment?: string) => {
    const isSole = currentOrganization.type === 'sole_proprietorship';
    const isAdmin = currentUser?.role === 'Organization Admin';
    const approverTitle = isSole
      ? 'Business Owner'
      : isAdmin
      ? 'Organization Admin'
      : 'Department Head';

    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          addAuditLog(
            `${approverTitle} Approval Granted`,
            r.referenceNumber,
            r.status,
            'Approved by Department',
            reviewerComment || `Approved by ${approverTitle}`
          );
          addNotification({
            userId: r.requesterId,
            title: `Request Approved by ${approverTitle}`,
            message: `Your request ${r.referenceNumber} has been approved and moved to Procurement.`,
            type: 'success',
            recordType: 'request',
            recordId: r.id,
          });
          addNotification({
            forRole: 'Procurement Officer',
            title: 'Approved Request in Queue',
            message: `Request ${r.referenceNumber} is ready for tender conversion.`,
            type: 'info',
            recordType: 'request',
            recordId: r.id,
          });
          return {
            ...r,
            status: 'Approved by Department',
            reviewerId: currentUser?.id,
            reviewerName: currentUser?.fullName || approverTitle,
            reviewComment: reviewerComment || `Approved by ${approverTitle}`,
            updatedAt: new Date().toISOString(),
          };
        }
        return r;
      })
    );
  };

  const returnRequest = (id: string, comment: string) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          addAuditLog('Returned Request for Correction', r.referenceNumber, r.status, 'Returned for Correction', comment);
          addNotification({
            userId: r.requesterId,
            title: 'Request Returned for Correction',
            message: `Your request ${r.referenceNumber} requires modification: "${comment}"`,
            type: 'warning',
            recordType: 'request',
            recordId: r.id,
          });
          return {
            ...r,
            status: 'Returned for Correction',
            reviewerId: currentUser?.id,
            reviewerName: currentUser?.fullName,
            reviewComment: comment,
            updatedAt: new Date().toISOString(),
          };
        }
        return r;
      })
    );
  };

  const rejectRequest = (id: string, reason: string) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          addAuditLog('Rejected Request', r.referenceNumber, r.status, 'Rejected', reason);
          addNotification({
            userId: r.requesterId,
            title: 'Request Rejected',
            message: `Your request ${r.referenceNumber} was rejected: "${reason}"`,
            type: 'danger',
            recordType: 'request',
            recordId: r.id,
          });
          return {
            ...r,
            status: 'Rejected',
            reviewerId: currentUser?.id,
            reviewerName: currentUser?.fullName,
            reviewComment: reason,
            updatedAt: new Date().toISOString(),
          };
        }
        return r;
      })
    );
  };

  // Tender Creation & Matching
  const createTenderFromRequest = (requestId: string, tenderData: Partial<Tender>): Tender => {
    const req = requests.find((r) => r.id === requestId);
    const orgDepts = departments.filter((d) =>
      d.organizationId ? d.organizationId === currentOrganization.id : currentOrganization.id === 'org-emerald'
    );
    const orgPrefix =
      currentOrganization.id === 'org-husab'
        ? 'TND-HUSB'
        : currentOrganization.id === 'org-nnpc'
        ? 'TND-NNPC'
        : 'TND-2026';
    const ref = getNextReference(
      orgPrefix,
      tenders.map((t) => t.referenceNumber)
    );

    // Auto-match active/approved vendors by categories (respecting blacklist/suspension & whitelist)
    const targetCats = tenderData.categories || (req?.items ? [...new Set(req.items.map((i) => i.category))] : []);
    const matchingVendors = vendors.filter((v) => {
      const eff = getVendorEffectiveStatus(v, currentOrganization.id);
      if (eff.status === 'Suspended' || eff.status === 'Blacklisted') return false;
      if (tenderData.restrictToMyVendors && !v.inMyVendors) return false;
      return v.categories.some((c) => targetCats.includes(c));
    });

    const newTender: Tender = {
      id: 'tnd-' + Date.now(),
      organizationId: currentOrganization.id,
      organizationName: currentOrganization.name,
      referenceNumber: ref,
      requestId,
      requestReference: req ? req.referenceNumber : '',
      title: tenderData.title || req?.title || 'Tender',
      description: tenderData.description || req?.justification || '',
      departmentId: tenderData.departmentId || req?.departmentId || orgDepts[0]?.id || 'dept-works',
      departmentName: tenderData.departmentName || req?.departmentName || orgDepts[0]?.name || 'Operations',
      categories: targetCats,
      items:
        tenderData.items ||
        (req?.items.map((i) => ({
          id: 'ti-' + i.id,
          description: i.description,
          category: i.category,
          subcategory: i.subcategory,
          quantity: i.quantity,
          unit: i.unit,
          specifications: 'Standard commercial grade as specified.',
        })) || []),
      deliveryLocation:
        tenderData.deliveryLocation ||
        `${currentOrganization.name} Central Facility, ${currentOrganization.address || 'Abuja'}`,
      requiredDeliveryPeriodDays: tenderData.requiredDeliveryPeriodDays || 21,
      bidOpeningDate: new Date().toISOString().split('T')[0],
      bidClosingDateTime:
        tenderData.bidClosingDateTime ||
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      evaluationWeights: tenderData.evaluationWeights || settings.defaultEvaluationWeights,
      mandatoryDocuments: tenderData.mandatoryDocuments || settings.requiredComplianceDocs,
      restrictToMyVendors: !!tenderData.restrictToMyVendors,
      status: 'Open',
      matchingVendorsNotifiedCount: matchingVendors.length,
      createdAt: new Date().toISOString(),
    };

    setTenders((prev) => [newTender, ...prev]);

    // Mark request as Converted to Tender
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'Converted to Tender', tenderId: newTender.id } : r))
    );

    // Notify matching vendors
    matchingVendors.forEach((v) => {
      addNotification({
        organizationId: currentOrganization.id,
        userId: v.userId,
        forRole: 'Vendor',
        title: 'New Tender Opportunity',
        message: `Tender ${ref} (${newTender.title}) from ${currentOrganization.name} has been published in your category.`,
        type: 'info',
        recordType: 'tender',
        recordId: newTender.id,
      });
    });

    addAuditLog(
      'Published Tender',
      ref,
      `Request: ${req?.referenceNumber}`,
      'Status: Open',
      `Auto-notified ${matchingVendors.length} registered vendors matching categories: ${targetCats.join(', ')}`
    );

    return newTender;
  };

  const extendTenderDeadline = (tenderId: string, newDate: string, reason: string) => {
    const existing = tenders.find((t) => t.id === tenderId);
    if (!existing || existing.status === 'Awarded' || existing.awardedBidId || existing.status === 'Closed' || existing.status === 'Cancelled' || existing.status === 'Under Evaluation') {
      return;
    }

    setTenders((prev) =>
      prev.map((t) => {
        if (t.id === tenderId) {
          addAuditLog('Extended Tender Deadline', t.referenceNumber, t.bidClosingDateTime, newDate, `Reason: ${reason}`);
          return {
            ...t,
            bidClosingDateTime: newDate,
            extendedDeadlineReason: reason,
          };
        }
        return t;
      })
    );
  };

  const cancelTender = (tenderId: string, reason: string) => {
    setTenders((prev) =>
      prev.map((t) => {
        if (t.id === tenderId) {
          addAuditLog('Cancelled Tender', t.referenceNumber, t.status, 'Cancelled', `Reason: ${reason}`);
          return {
            ...t,
            status: 'Cancelled',
            cancellationReason: reason,
          };
        }
        return t;
      })
    );
  };

  // Vendor Bidding - Enforce single bid submission per vendor (Section 6.4)
  const submitBid = (tenderId: string, bidData: Partial<Bid>): Bid => {
    const tnd = tenders.find((t) => t.id === tenderId);
    const vendor = vendors.find((v) => v.id === (bidData.vendorId || currentUser?.vendorId));
    const targetVendorId = vendor?.id || bidData.vendorId || 'vendor-1';

    // Check if vendor has already submitted a bid for this tender
    const existing = bids.find((b) => b.tenderId === tenderId && b.vendorId === targetVendorId);
    if (existing) {
      return existing; // Vendor can only submit a bid once per tender!
    }

    // Check if vendor is suspended specifically by the procuring organization
    if (vendor && tnd?.organizationId) {
      const eff = getVendorEffectiveStatus(vendor, tnd.organizationId);
      if (eff.status === 'Suspended' || eff.status === 'Blacklisted') {
        throw new Error(`Vendor ${vendor.businessName} is currently ${eff.status.toLowerCase()} by this organization.`);
      }
    }

    const ref = getNextReference(
      'BID-2026',
      bids.map((b) => b.referenceNumber)
    );
    const total = (bidData.items || []).reduce((acc, it) => acc + it.totalPrice, 0);

    const newBid: Bid = {
      id: 'bid-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      referenceNumber: ref,
      tenderId,
      tenderReference: tnd?.referenceNumber || '',
      vendorId: targetVendorId,
      vendorName: vendor?.businessName || bidData.vendorName || 'Registered Vendor',
      items: bidData.items || [],
      totalAmount: total,
      proposedDeliveryDate: bidData.proposedDeliveryDate || new Date().toISOString().split('T')[0],
      warrantyPeriod: bidData.warrantyPeriod || '12 Months',
      technicalProposal: bidData.technicalProposal || '',
      uploadedDocuments: bidData.uploadedDocuments || {},
      legalWarningAcknowledged: !!bidData.legalWarningAcknowledged,
      legalWarningTimestamp: bidData.legalWarningTimestamp || new Date().toISOString(),
      status: 'Submitted',
      submittedAt: new Date().toISOString(),
    };

    setBids((prev) => [newBid, ...prev]);
    addAuditLog('Submitted Bid', ref, undefined, `Tender: ${tnd?.referenceNumber}`, `Total: ₦${total.toLocaleString()}, Legal acknowledgement recorded.`);

    addNotification({
      organizationId: tnd?.organizationId || currentOrganization.id,
      forRole: 'Procurement Officer',
      title: 'New Bid Received',
      message: `A new bid was submitted for ${tnd?.referenceNumber} by ${newBid.vendorName}.`,
      type: 'info',
      recordType: 'tender',
      recordId: tenderId,
    });

    return newBid;
  };

  // Evaluation & Scoring Algorithm
  const evaluateCompliance = (bidId: string, passed: boolean, reason?: string) => {
    setBids((prev) =>
      prev.map((b) => {
        if (b.id === bidId) {
          addAuditLog('Compliance Evaluation', b.referenceNumber, undefined, passed ? 'Passed' : 'Disqualified', reason);
          return {
            ...b,
            compliancePassed: passed,
            complianceReason: reason,
          };
        }
        return b;
      })
    );
  };

  const evaluateTechnical = (bidId: string, score: number, comments: string) => {
    setBids((prev) =>
      prev.map((b) => {
        if (b.id === bidId) {
          addAuditLog('Technical Evaluation Score', b.referenceNumber, undefined, `Score: ${score}/100`, comments);
          return {
            ...b,
            technicalScore: score,
            technicalComments: comments,
          };
        }
        return b;
      })
    );
  };

  const calculateVendorRecommendations = (tenderId: string): Bid[] => {
    const tnd = tenders.find((t) => t.id === tenderId);
    if (!tnd) return [];

    const tenderBids = bids.filter((b) => b.tenderId === tenderId && b.compliancePassed !== false);
    if (tenderBids.length === 0) return [];

    const weights = tnd.evaluationWeights;

    // 1. Price Score: Lowest bid gets 100, others get lowest / their price * 100
    const prices = tenderBids.map((b) => b.totalAmount).filter((p) => p > 0);
    const minPrice = Math.min(...prices);

    // 2. Delivery Time Score: Calculate days from today or tender open date to proposed delivery date
    const deliveryDays = tenderBids.map((b) => {
      const days = Math.max(1, Math.round((new Date(b.proposedDeliveryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)));
      return days;
    });
    const minDays = Math.min(...deliveryDays);

    const scoredBids = tenderBids.map((bid) => {
      const vendor = vendors.find((v) => v.id === bid.vendorId);
      const priceScore = minPrice > 0 && bid.totalAmount > 0 ? (minPrice / bid.totalAmount) * 100 : 0;

      const currentDays = Math.max(1, Math.round((new Date(bid.proposedDeliveryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)));
      const deliveryScore = minDays > 0 ? (minDays / currentDays) * 100 : 100;

      // Reliability Score: from vendor history (neutral 60 if new)
      const reliabilityScore = vendor ? vendor.reliabilityScore : 60;

      // Technical Score: entered by officer (defaults to 75 if not yet entered)
      const technicalScore = bid.technicalScore !== undefined ? bid.technicalScore : 75;

      const totalWeightedScore =
        (priceScore * weights.price +
          deliveryScore * weights.deliveryTime +
          reliabilityScore * weights.vendorReliability +
          technicalScore * weights.technicalScore) /
        100;

      return {
        ...bid,
        computedScores: {
          priceScore: parseFloat(priceScore.toFixed(1)),
          deliveryScore: parseFloat(deliveryScore.toFixed(1)),
          reliabilityScore: parseFloat(reliabilityScore.toFixed(1)),
          technicalScore: parseFloat(technicalScore.toFixed(1)),
          totalWeightedScore: parseFloat(totalWeightedScore.toFixed(2)),
          rank: 0,
        },
      };
    });

    // Rank bids descending by total weighted score
    scoredBids.sort((a, b) => (b.computedScores?.totalWeightedScore || 0) - (a.computedScores?.totalWeightedScore || 0));
    scoredBids.forEach((b, idx) => {
      if (b.computedScores) b.computedScores.rank = idx + 1;
    });

    // Update in state only if scores actually changed
    setBids((prev) => {
      let hasChanges = false;
      const next = prev.map((b) => {
        const found = scoredBids.find((sb) => sb.id === b.id);
        if (!found) return b;
        const curScore = b.computedScores?.totalWeightedScore;
        const nextScore = found.computedScores?.totalWeightedScore;
        const curRank = b.computedScores?.rank;
        const nextRank = found.computedScores?.rank;
        if (curScore !== nextScore || curRank !== nextRank) {
          hasChanges = true;
          return found;
        }
        return b;
      });
      return hasChanges ? next : prev;
    });

    return scoredBids;
  };

  // Award Decision & PO Generation
  const awardTender = (
    tenderId: string,
    winningBidId: string,
    justification?: string
  ): { requiresAuthority: boolean; poCreated?: PurchaseOrder } => {
    const tnd = tenders.find((t) => t.id === tenderId);
    const winBid = bids.find((b) => b.id === winningBidId);
    if (!tnd || !winBid) return { requiresAuthority: false };

    const vendor = vendors.find((v) => v.id === winBid.vendorId);
    const dept = departments.find((d) => d.id === tnd.departmentId);
    const threshold = currentOrganization.approvalThreshold || settings.approvalThreshold;
    const requiresAuthority = winBid.totalAmount > threshold;
    const isSole = currentOrganization.type === 'sole_proprietorship';
    const isAuthorityUser = currentUser?.role === 'Approving Authority' || (isSole && currentUser?.role === 'Organization Admin');

    // If high-value award is submitted by a non-authority officer, place on Approving Authority hold
    if (requiresAuthority && !isAuthorityUser) {
      submitAwardRecommendation(tenderId, winningBidId, justification);
      return { requiresAuthority: true };
    }

    const result = finalizeAward(tenderId, winBid, vendor, dept, justification);

    if (requiresAuthority) {
      addNotification({
        forRole: 'Approving Authority',
        title: 'High-Value Award Notification',
        message: `Tender ${tnd.referenceNumber} awarded at ₦${winBid.totalAmount.toLocaleString()} to ${winBid.vendorName} (exceeds ₦${threshold.toLocaleString()} threshold).`,
        type: 'warning',
        recordType: 'tender',
        recordId: tenderId,
      });
      addAuditLog(
        'High-Value Contract Awarded',
        tnd.referenceNumber,
        'Under Evaluation',
        'Awarded',
        `Contract awarded at ₦${winBid.totalAmount.toLocaleString()} (Statutory threshold exceeded). PO ${result.poCreated?.referenceNumber} generated.`
      );
    }

    return result;
  };

  const submitAwardRecommendation = (tenderId: string, winningBidId: string, justification?: string) => {
    const tnd = tenders.find((t) => t.id === tenderId);
    const winBid = bids.find((b) => b.id === winningBidId);
    if (!tnd || !winBid) return;

    setTenders((prev) =>
      prev.map((t) =>
        t.id === tenderId
          ? {
              ...t,
              status: 'Under Evaluation',
              awaitingAuthorityApproval: true,
              pendingAuthorityBidId: winningBidId,
            }
          : t
      )
    );

    addAuditLog(
      'Submitted High-Value Award Recommendation',
      tnd.referenceNumber,
      tnd.status,
      'Awaiting Approving Authority',
      `Recommended ${winBid.vendorName} at ₦${winBid.totalAmount.toLocaleString()}. ${justification || ''}`
    );

    addNotification({
      organizationId: tnd.organizationId || currentOrganization.id,
      forRole: 'Approving Authority',
      title: 'High-Value Award Awaiting Authorization',
      message: `${tnd.referenceNumber} recommended for award to ${winBid.vendorName} (₦${winBid.totalAmount.toLocaleString()}). Executive sign-off required before PO issuance.`,
      type: 'warning',
      recordType: 'tender',
      recordId: tenderId,
    });
  };

  const approveTenderBudgetOverride = (tenderId: string, overrideReason: string) => {
    const tnd = tenders.find((t) => t.id === tenderId);
    if (!tnd || !overrideReason.trim()) return;

    const approver = currentUser?.fullName || 'Finance Officer';
    setTenders((prev) =>
      prev.map((t) =>
        t.id === tenderId
          ? {
              ...t,
              budgetOverrideApproved: true,
              budgetOverrideReason: overrideReason.trim(),
              budgetOverrideBy: approver,
            }
          : t
      )
    );

    addAuditLog(
      'Budget Override Approved by Finance',
      tnd.referenceNumber,
      'Budget Cap Exceeded',
      'Override Granted',
      `Authorized by ${approver}: ${overrideReason.trim()}`
    );

    addNotification({
      organizationId: tnd.organizationId || currentOrganization.id,
      forRole: 'Approving Authority',
      title: 'Finance Budget Override Approved',
      message: `${approver} authorized a budget variance override for ${tnd.referenceNumber}. Award finalization is now unblocked.`,
      type: 'success',
      recordType: 'tender',
      recordId: tenderId,
    });
  };

  const requestTenderBudgetOverride = (tenderId: string, bidAmount: number, shortfall: number) => {
    const tnd = tenders.find((t) => t.id === tenderId);
    if (!tnd) return;

    addAuditLog(
      'Requested Finance Budget Override',
      tnd.referenceNumber,
      'Blocked by Budget Cap',
      'Pending Finance Override',
      `Proposed bid ₦${bidAmount.toLocaleString()} exceeds remaining department budget by ₦${shortfall.toLocaleString()}.`
    );

    addNotification({
      organizationId: tnd.organizationId || currentOrganization.id,
      forRole: 'Finance Officer',
      title: 'Budget Variance Override Requested',
      message: `Award for ${tnd.referenceNumber} (₦${bidAmount.toLocaleString()}) exceeds department remaining budget by ₦${shortfall.toLocaleString()}. Please review in Budget Variance Overrides.`,
      type: 'danger',
      recordType: 'tender',
      recordId: tenderId,
    });
  };

  const finalizeAward = (
    tenderId: string,
    winBid: Bid,
    vendor?: VendorProfile,
    dept?: Department,
    justification?: string
  ) => {
    const tnd = tenders.find((t) => t.id === tenderId);
    const orgId = tnd?.organizationId || currentOrganization.id;
    const poPrefix =
      orgId === 'org-husab' ? 'PO-HUSB' : orgId === 'org-nnpc' ? 'PO-NNPC' : 'PO-2026';
    const poRef = getNextReference(
      poPrefix,
      purchaseOrders.map((p) => p.referenceNumber)
    );

    // Update tender status and store awardedBidId
    setTenders((prev) =>
      prev.map((t) =>
        t.id === tenderId
          ? {
              ...t,
              status: 'Awarded',
              awaitingAuthorityApproval: false,
              pendingAuthorityBidId: undefined,
              awardedBidId: winBid.id,
            }
          : t
      )
    );

    // Update bids status: winner = Awarded, others = Not Selected
    setBids((prev) =>
      prev.map((b) => {
        if (b.tenderId === tenderId) {
          return {
            ...b,
            status: b.id === winBid.id ? 'Awarded' : 'Not Selected',
          };
        }
        return b;
      })
    );

    // Generate Purchase Order
    const newPO: PurchaseOrder = {
      id: 'po-' + Date.now(),
      organizationId: orgId,
      referenceNumber: poRef,
      tenderId,
      tenderReference: tnd?.referenceNumber || '',
      awardId: 'award-' + Date.now(),
      vendorId: winBid.vendorId,
      vendorName: winBid.vendorName,
      vendorAddress: vendor?.address || 'Nigeria',
      vendorPhone: vendor?.phone || '',
      vendorEmail: vendor?.email || '',
      departmentId: dept?.id || tnd?.departmentId || 'dept-works',
      departmentName: dept?.name || tnd?.departmentName || 'Works',
      items: winBid.items.map((bi) => ({
        id: 'poi-' + bi.itemId,
        description: bi.description,
        quantity: bi.quantity,
        unit: bi.unit,
        unitPrice: bi.unitPrice,
        totalPrice: bi.totalPrice,
        receivedQuantity: 0,
      })),
      totalAmount: winBid.totalAmount,
      expectedDeliveryDate: winBid.proposedDeliveryDate,
      deliveryLocation: tnd?.deliveryLocation || `${currentOrganization.name} Operating Facility, ${currentOrganization.address || 'Nigeria'}`,
      terms: 'Payment strictly net 14 days upon delivery acceptance and verification.',
      status: 'Issued',
      issuedAt: new Date().toISOString(),
      paidAmount: 0,
    };

    setPurchaseOrders((prev) => [newPO, ...prev]);

    // Update Vendor cumulative award stats
    setVendors((prev) =>
      prev.map((v) =>
        v.id === winBid.vendorId
          ? {
              ...v,
              totalOrders: v.totalOrders + 1,
              totalValueAwarded: v.totalValueAwarded + winBid.totalAmount,
            }
          : v
      )
    );

    // Update Department Committed Budget
    if (dept) {
      setDepartments((prev) =>
        prev.map((d) => (d.id === dept.id ? { ...d, committed: d.committed + winBid.totalAmount } : d))
      );
    }

    // Notifications
    addNotification({
      organizationId: orgId,
      userId: vendor?.userId,
      forRole: 'Vendor',
      title: 'Congratulations! Tender Awarded',
      message: `Your bid for ${tnd?.referenceNumber} (${tnd?.title}) was accepted. Purchase Order ${poRef} has been issued.`,
      type: 'success',
      recordType: 'po',
      recordId: newPO.id,
    });

    addAuditLog(
      'Tender Awarded & PO Issued',
      tnd?.referenceNumber || '',
      'Under Evaluation',
      `Awarded to ${winBid.vendorName}`,
      `PO Reference ${poRef} issued for ₦${winBid.totalAmount.toLocaleString()}. ${justification || ''}`
    );

    return { requiresAuthority: false, poCreated: newPO };
  };

  const authorityApproveAward = (tenderId: string, approved: boolean, reason?: string) => {
    const tnd = tenders.find((t) => t.id === tenderId);
    const winBidId = tnd?.pendingAuthorityBidId || bids.find((b) => b.tenderId === tenderId)?.id;
    const winBid = bids.find((b) => b.id === winBidId);
    if (!tnd || !winBid) return;

    if (approved) {
      const vendor = vendors.find((v) => v.id === winBid.vendorId);
      const dept = departments.find((d) => d.id === tnd.departmentId);
      finalizeAward(tenderId, winBid, vendor, dept, `Approved by Authority: ${reason || 'Authorized'}`);
    } else {
      if (!reason || !reason.trim()) return;
      setTenders((prev) =>
        prev.map((t) =>
          t.id === tenderId
            ? { ...t, awaitingAuthorityApproval: false, pendingAuthorityBidId: undefined }
            : t
        )
      );
      addAuditLog('Award Rejected by Approving Authority', tnd.referenceNumber, 'Awaiting Authority', 'Under Evaluation', reason.trim());
      addNotification({
        organizationId: tnd.organizationId || currentOrganization.id,
        forRole: 'Procurement Officer',
        title: 'Award Decision Returned by Approving Authority',
        message: `Award for ${tnd.referenceNumber} was not approved: "${reason.trim()}". Returned to evaluation.`,
        type: 'danger',
        recordType: 'tender',
        recordId: tenderId,
      });
    }
  };

  const overrideBudgetAndAward = (tenderId: string, winningBidId: string, overrideReason: string) => {
    const winBid = bids.find((b) => b.id === winningBidId);
    const tnd = tenders.find((t) => t.id === tenderId);
    const vendor = vendors.find((v) => v.id === winBid?.vendorId);
    const dept = departments.find((d) => d.id === tnd?.departmentId);

    if (tnd && winBid) {
      addAuditLog(
        'Budget Override Approved by Finance',
        tnd.referenceNumber,
        'Budget Exceeded',
        'Override Granted',
        `Reason: ${overrideReason}`
      );
      finalizeAward(tenderId, winBid, vendor, dept, `Budget override: ${overrideReason}`);
    }
  };

  // PO & Delivery Actions
  const acknowledgePO = (poId: string) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => {
        if (po.id === poId) {
          addAuditLog('PO Acknowledged by Vendor', po.referenceNumber, po.status, 'Acknowledged', 'Vendor accepted terms and timeline');
          addNotification({
            forRole: 'Procurement Officer',
            title: 'Purchase Order Acknowledged',
            message: `${po.vendorName} acknowledged ${po.referenceNumber}. Delivery expected ${po.expectedDeliveryDate}.`,
            type: 'info',
            recordType: 'po',
            recordId: po.id,
          });
          return { ...po, status: 'Acknowledged', acknowledgedAt: new Date().toISOString() };
        }
        return po;
      })
    );
  };

  const dispatchDelivery = (poId: string, notes: string) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => {
        if (po.id === poId) {
          addAuditLog('Items Dispatched by Vendor', po.referenceNumber, po.status, 'Dispatched', notes);
          addNotification({
            forRole: 'Procurement Officer',
            title: 'Items Dispatched by Vendor',
            message: `${po.vendorName} dispatched items for ${po.referenceNumber}. Notes: ${notes}`,
            type: 'info',
            recordType: 'po',
            recordId: po.id,
          });
          return {
            ...po,
            dispatchedAt: new Date().toISOString(),
            dispatchNotes: notes,
          };
        }
        return po;
      })
    );
  };

  const receiveDelivery = (
    poId: string,
    itemsReceived: DeliveryRecord['itemsReceived'],
    decision?: 'Approved' | 'Rejected',
    rejectionReason?: string
  ) => {
    const po = purchaseOrders.find((p) => p.id === poId);
    if (!po) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const expected = new Date(po.expectedDeliveryDate);
    const actual = new Date(todayStr);

    const diffDays = Math.round((actual.getTime() - expected.getTime()) / (1000 * 3600 * 24));
    const isOnTime = diffDays <= 0;
    const lateDays = isOnTime ? 0 : diffDays;

    const totalOrdered = po.items.reduce((acc, i) => acc + i.quantity, 0);
    const totalAccepted = itemsReceived.reduce((acc, i) => (i.status === 'Accepted' ? acc + i.received : acc), 0);
    const isFull = totalAccepted >= totalOrdered;

    // Check if the inspection decision was Rejected, or if all items were marked Rejected
    const isExplicitlyRejected =
      decision === 'Rejected' || (itemsReceived.length > 0 && itemsReceived.every((i) => i.status === 'Rejected'));

    const outcome: 'Approved' | 'Partially Approved' | 'Rejected' = isExplicitlyRejected
      ? 'Rejected'
      : isFull
      ? 'Approved'
      : 'Partially Approved';

    const newDelivery: DeliveryRecord = {
      id: 'del-' + Date.now(),
      organizationId: po.organizationId || currentOrganization.id,
      purchaseOrderId: poId,
      poReference: po.referenceNumber,
      vendorId: po.vendorId,
      vendorName: po.vendorName,
      dispatchDate: po.dispatchedAt || todayStr,
      dispatchNotes: po.dispatchNotes || 'Standard delivery consignment',
      receivedDate: todayStr,
      receivedByUserId: currentUser?.id || 'officer',
      receivedByName: currentUser?.fullName || 'Receiving Officer',
      itemsReceived,
      isFullyDelivered: isExplicitlyRejected ? false : isFull,
      onTime: isOnTime,
      lateDays,
      outcome,
      rejectionReason: isExplicitlyRejected
        ? rejectionReason || 'Consignment failed physical inspection and technical quality criteria.'
        : undefined,
    };

    setDeliveries((prev) => [newDelivery, ...prev]);

    // Update PO status - IF REJECTED, status is 'Rejected' so it will not remain in pending queue!
    setPurchaseOrders((prev) =>
      prev.map((p) => {
        if (p.id === poId) {
          return {
            ...p,
            status: isExplicitlyRejected ? 'Rejected' : isFull ? 'Delivered' : 'Partially Delivered',
            actualDeliveryDate: todayStr,
            deliveredOnTime: isOnTime,
            lateDays,
            items: p.items.map((it, idx) => ({
              ...it,
              receivedQuantity: isExplicitlyRejected ? 0 : (itemsReceived[idx]?.received || it.receivedQuantity),
            })),
          };
        }
        return p;
      })
    );

    // Update Vendor reliability metrics
    setVendors((prev) =>
      prev.map((v) => {
        if (v.id === po.vendorId) {
          if (isExplicitlyRejected) {
            // Rejected delivery penalizes reliability
            const late = v.lateDeliveries + 1;
            const total = v.onTimeDeliveries + late;
            const newScore = total > 0 ? Math.round((v.onTimeDeliveries / total) * 100) : v.reliabilityScore;
            return {
              ...v,
              lateDeliveries: late,
              reliabilityScore: newScore,
            };
          } else {
            const onTime = isOnTime ? v.onTimeDeliveries + 1 : v.onTimeDeliveries;
            const late = !isOnTime ? v.lateDeliveries + 1 : v.lateDeliveries;
            const total = onTime + late;
            const newScore = total > 0 ? Math.round((onTime / total) * 100) : v.reliabilityScore;
            return {
              ...v,
              onTimeDeliveries: onTime,
              lateDeliveries: late,
              reliabilityScore: newScore,
            };
          }
        }
        return v;
      })
    );

    if (isExplicitlyRejected) {
      addAuditLog(
        'Store Inspection Rejected Consignment',
        po.referenceNumber,
        po.status,
        'Rejected',
        `Reason: ${rejectionReason || 'Physical inspection failed'}`
      );

      addNotification({
        forRole: 'Procurement Officer',
        title: 'Delivery Rejected by Store',
        message: `Consignment for ${po.referenceNumber} (${po.vendorName}) was REJECTED during store inspection. ${rejectionReason ? `Reason: ${rejectionReason}` : ''}`,
        type: 'danger',
        recordType: 'po',
        recordId: po.id,
      });
    } else {
      addAuditLog(
        'Store Received Consignment',
        po.referenceNumber,
        po.status,
        isFull ? 'Delivered' : 'Partially Delivered',
        `On-Time: ${isOnTime ? 'Yes' : `Late by ${lateDays} days`}`
      );

      addNotification({
        forRole: 'Finance Officer',
        title: 'Delivery Received - Payment Due',
        message: `Items for ${po.referenceNumber} have been received and verified. Payment is now due.`,
        type: 'info',
        recordType: 'po',
        recordId: po.id,
      });
    }
  };

  // Payments
  const recordPayment = (
    paymentData: Omit<PaymentRecord, 'id' | 'voucherNumber' | 'recordedByUserId' | 'recordedByName'>
  ): PaymentRecord => {
    const po = purchaseOrders.find((p) => p.id === paymentData.purchaseOrderId);
    const orgId = paymentData.organizationId || po?.organizationId || currentOrganization.id;
    const pvPrefix =
      orgId === 'org-husab' ? 'PV-HUSB' : orgId === 'org-nnpc' ? 'PV-NNPC' : 'PV-2026';
    const voucherNumber = getNextReference(
      pvPrefix,
      payments.map((p) => p.voucherNumber)
    );

    const newPayment: PaymentRecord = {
      ...paymentData,
      organizationId: orgId,
      id: 'pay-' + Date.now(),
      voucherNumber,
      recordedByUserId: currentUser?.id || 'finance',
      recordedByName: currentUser?.fullName || 'Finance Officer',
    };

    setPayments((prev) => [newPayment, ...prev]);

    // Update PO paid amount and status
    if (po) {
      const updatedPaid = po.paidAmount + paymentData.amount;
      const isFullyPaid = updatedPaid >= po.totalAmount;
      const isCompleted = isFullyPaid && (po.status === 'Delivered' || po.items.every((i) => i.receivedQuantity >= i.quantity));

      setPurchaseOrders((prev) =>
        prev.map((p) =>
          p.id === po.id
            ? {
                ...p,
                paidAmount: updatedPaid,
                status: isCompleted ? 'Closed' : p.status,
              }
            : p
        )
      );

      // Update Department budget: reduce committed, increase spent
      setDepartments((prev) =>
        prev.map((d) =>
          d.id === po.departmentId
            ? {
                ...d,
                spent: d.spent + paymentData.amount,
                committed: Math.max(0, d.committed - paymentData.amount),
              }
            : d
        )
      );

      // Trigger Celebration Animation if fully closed!
      if (isCompleted) {
        setCelebrationOpen(true);
      }
    }

    addAuditLog(
      'Recorded Payment',
      voucherNumber,
      undefined,
      `Paid: ₦${paymentData.amount.toLocaleString()}`,
      `Method: ${paymentData.method}, Ref: ${paymentData.referenceNumber}`
    );

    addNotification({
      organizationId: orgId,
      userId: vendors.find((v) => v.id === paymentData.vendorId)?.userId,
      forRole: 'Vendor',
      title: 'Payment Remittance Issued',
      message: `Payment voucher ${voucherNumber} of ₦${paymentData.amount.toLocaleString()} has been processed for ${paymentData.poReference}.`,
      type: 'success',
      recordType: 'payment',
      recordId: newPayment.id,
    });

    return newPayment;
  };

  // Vendor Directory Management
  const toggleMyVendor = (vendorId: string) => {
    setVendors((prev) =>
      prev.map((v) => {
        if (v.id === vendorId) {
          const newVal = !v.inMyVendors;
          addAuditLog('Updated Vendor List', v.businessName, v.inMyVendors ? 'In My Vendors' : 'Standard', newVal ? 'Added to My Vendors' : 'Removed from My Vendors');
          return { ...v, inMyVendors: newVal };
        }
        return v;
      })
    );
  };

  const updateVendorStatus = (
    vendorId: string,
    status: VendorProfile['status'],
    reason?: string,
    targetOrgId?: string
  ) => {
    const orgId = targetOrgId || currentOrganization.id;
    setVendors((prev) =>
      prev.map((v) => {
        if (v.id === vendorId) {
          const orgStatuses = { ...(v.organizationStatuses || {}) };
          const previousStatus = orgStatuses[orgId]?.status || 'Approved';
          orgStatuses[orgId] = {
            status,
            reason,
            updatedAt: new Date().toISOString(),
          };
          addAuditLog(
            'Vendor Status Changed',
            `${v.businessName} (${currentOrganization.name})`,
            previousStatus,
            status,
            reason
          );
          return {
            ...v,
            organizationStatuses: orgStatuses,
          };
        }
        return v;
      })
    );
  };

  const getVendorEffectiveStatus = (
    vendor: VendorProfile,
    orgId?: string
  ): { status: VendorProfile['status']; reason?: string } => {
    const targetOrg = orgId || currentOrganization.id;
    if (vendor.organizationStatuses && vendor.organizationStatuses[targetOrg]) {
      return vendor.organizationStatuses[targetOrg];
    }
    // Default fallback: unless specifically suspended by this target organization, vendor is active & approved
    return { status: vendor.status === 'Registered' ? 'Registered' : 'Approved' };
  };

  // Budget Adjustments - Restricted to Finance Officer (or Sole Proprietorship Owner)
  const adjustBudget = (deptId: string, newBudget: number, reason: string) => {
    const isSole = currentOrganization.type === 'sole_proprietorship';
    if (!isSole && currentUser?.role !== 'Finance Officer') {
      return; // Admin / others cannot adjust budget in multi-department organizations with a chain of command
    }

    const dept = departments.find((d) => d.id === deptId);
    if (!dept) return;

    const oldBudget = dept.annualBudget;
    const newChange: BudgetChange = {
      id: 'bc-' + Date.now(),
      departmentId: deptId,
      departmentName: dept.name,
      previousBudget: oldBudget,
      newBudget,
      reason,
      changedBy: currentUser?.fullName || 'Finance',
      changedAt: new Date().toISOString(),
    };

    setBudgetChanges((prev) => [newChange, ...prev]);
    setDepartments((prev) =>
      prev.map((d) => (d.id === deptId ? { ...d, annualBudget: newBudget } : d))
    );

    addAuditLog('Adjusted Department Budget', dept.name, `₦${oldBudget.toLocaleString()}`, `₦${newBudget.toLocaleString()}`, reason);
  };

  // Department Management (Add, Remove, Update)
  const addDepartment = (name: string, annualBudget: number, orgId?: string): Department => {
    const targetOrgId = orgId || currentOrganization.id;
    const newDept: Department = {
      id: 'dept-' + Date.now(),
      organizationId: targetOrgId,
      name: name.trim(),
      annualBudget: Math.max(0, annualBudget),
      spent: 0,
      committed: 0,
    };

    setDepartments((prev) => [...prev, newDept]);
    addAuditLog('Created Department', newDept.name, '-', `Budget: ₦${newDept.annualBudget.toLocaleString()}`, `Created for ${currentOrganization.name}`);
    return newDept;
  };

  const deleteDepartment = (deptId: string): { success: boolean; message?: string } => {
    const dept = departments.find((d) => d.id === deptId);
    if (!dept) return { success: false, message: 'Department not found' };

    // Prevent deletion if active requisitions, open tenders, or POs are attached
    const activeReqs = requests.filter((r) => r.departmentId === deptId && r.status !== 'Rejected' && r.status !== 'Converted to Tender');
    const activeTenders = tenders.filter((t) => t.departmentId === deptId && t.status !== 'Cancelled' && t.status !== 'Awarded');
    const activePOs = purchaseOrders.filter((po) => po.departmentId === deptId && po.status !== 'Closed' && po.status !== 'Cancelled');

    if (activeReqs.length > 0 || activeTenders.length > 0 || activePOs.length > 0) {
      return {
        success: false,
        message: `Cannot remove "${dept.name}": There are active requisitions (${activeReqs.length}), tenders (${activeTenders.length}), or purchase orders (${activePOs.length}) currently assigned to this department.`,
      };
    }

    setDepartments((prev) => prev.filter((d) => d.id !== deptId));
    addAuditLog('Deleted Department', dept.name, `Budget: ₦${dept.annualBudget.toLocaleString()}`, 'Removed', `Deleted by ${currentUser?.fullName || 'User'}`);
    return { success: true };
  };

  const updateDepartment = (deptId: string, name: string, annualBudget?: number) => {
    setDepartments((prev) =>
      prev.map((d) => {
        if (d.id === deptId) {
          return {
            ...d,
            name: name.trim() || d.name,
            annualBudget: annualBudget !== undefined ? Math.max(0, annualBudget) : d.annualBudget,
          };
        }
        return d;
      })
    );
    addAuditLog('Updated Department', name, '-', annualBudget !== undefined ? `₦${annualBudget.toLocaleString()}` : '-', `Updated by ${currentUser?.fullName || 'User'}`);
  };

  // Admin User Management
  const adminApproveUser = (userId: string, role: UserRole, deptId?: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          addAuditLog('Approved Staff Account', u.fullName, 'Pending', role, `Department: ${deptId || 'None'}`);
          return { ...u, role, departmentId: deptId, status: 'Active' };
        }
        return u;
      })
    );
  };

  const adminUpdateUserRole = (userId: string, newRole: UserRole, deptId?: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          addAuditLog('Changed User Role', u.fullName, u.role, newRole, `Dept: ${deptId || u.departmentId}`);
          return { ...u, role: newRole, departmentId: deptId || u.departmentId };
        }
        return u;
      })
    );
  };

  const adminToggleUserStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const nextStatus = u.status === 'Active' ? 'Deactivated' : 'Active';
          addAuditLog('Toggled User Status', u.fullName, u.status, nextStatus);
          return { ...u, status: nextStatus };
        }
        return u;
      })
    );
  };

  const adminResetUserPassword = (userId: string): { success: boolean; tempPassword: string } => {
    const user = users.find((u) => u.id === userId);
    if (!user) return { success: false, tempPassword: '' };
    const tempPass = `Procura#${Math.floor(1000 + Math.random() * 9000)}`;
    const hashed = hashPassword(tempPass);
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, mustChangePassword: true, tempPassword: tempPass, passwordHash: hashed }
          : u
      )
    );
    addAuditLog(
      'Admin Password Reset',
      user.fullName,
      undefined,
      'Temporary Password Set',
      'Administrator issued new temporary password; change enforced on next sign in.'
    );
    return { success: true, tempPassword: tempPass };
  };

  // Categories
  const addCategory = (name: string, subcategories: string[]) => {
    const newCat: Category = {
      id: 'cat-' + Date.now(),
      name,
      subcategories,
      active: true,
    };
    setCategories((prev) => [...prev, newCat]);
    addAuditLog('Created Category', name, undefined, 'Active', `Subcategories: ${subcategories.join(', ')}`);
  };

  const deactivateCategory = (categoryId: string) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === categoryId) {
          addAuditLog('Deactivated Category', c.name, 'Active', 'Inactive', 'Category can no longer be tagged on new tenders');
          return { ...c, active: false };
        }
        return c;
      })
    );
  };

  const reactivateCategory = (categoryId: string) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === categoryId) {
          addAuditLog('Reactivated Category', c.name, 'Inactive', 'Active', 'Category reactivated for procurement use');
          return { ...c, active: true };
        }
        return c;
      })
    );
  };

  const editCategory = (categoryId: string, newName: string, newSubcategories: string[]) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === categoryId) {
          addAuditLog('Edited Category', c.name, undefined, newName, `Subcategories: ${newSubcategories.join(', ')}`);
          return { ...c, name: newName, subcategories: newSubcategories };
        }
        return c;
      })
    );
  };

  // Export & Import Database JSON
  const exportDatabaseJson = (): string => {
    const fullBackup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      organization: currentOrganization.name,
      settings,
      departments,
      users,
      categories,
      vendors,
      requests,
      tenders,
      bids,
      purchaseOrders,
      deliveries,
      payments,
      budgetChanges,
      notifications,
      auditLogs,
    };
    return JSON.stringify(fullBackup, null, 2);
  };

  const importDatabaseJson = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.settings) setSettings(data.settings);
      if (data.departments) setDepartments(data.departments);
      if (data.users) setUsers(data.users);
      if (data.categories) setCategories(data.categories);
      if (data.vendors) setVendors(data.vendors);
      if (data.requests) setRequests(data.requests);
      if (data.tenders) setTenders(data.tenders);
      if (data.bids) setBids(data.bids);
      if (data.purchaseOrders) setPurchaseOrders(data.purchaseOrders);
      if (data.deliveries) setDeliveries(data.deliveries);
      if (data.payments) setPayments(data.payments);
      if (data.notifications) setNotifications(data.notifications);
      if (data.auditLogs) setAuditLogs(data.auditLogs);
      return true;
    } catch {
      return false;
    }
  };

  // Inactivity Timer
  const resetInactivityTimer = useCallback(() => {
    setInactivityModalOpen(false);
  }, []);

  const staySignedIn = () => {
    setInactivityModalOpen(false);
  };

  return (
    <AppContext.Provider
      value={{
        organizations,
        currentOrganization,
        switchOrganization,
        registerOrganization,
        provisionStaffUser,
        changeTempPassword,
        settings,
        updateSettings,
        departments,
        users,
        categories,
        vendors,
        requests,
        tenders,
        bids,
        purchaseOrders,
        deliveries,
        payments,
        budgetChanges,
        notifications,
        auditLogs,
        currentUser,
        isAuthenticated: !!currentUser,
        theme,
        setTheme,
        toggleTheme,
        sidebarCollapsed,
        setSidebarCollapsed,
        login,
        logout,
        switchUser,
        loadDemoData,
        resetAllData,
        registerVendor,
        registerStaffUser,
        updateUserProfile,
        addAuditLog,
        addNotification,
        markNotificationRead,
        markAllNotificationsRead,
        createRequest,
        updateRequest,
        approveRequest,
        returnRequest,
        rejectRequest,
        createTenderFromRequest,
        extendTenderDeadline,
        cancelTender,
        submitBid,
        evaluateCompliance,
        evaluateTechnical,
        calculateVendorRecommendations,
        awardTender,
        submitAwardRecommendation,
        approveTenderBudgetOverride,
        requestTenderBudgetOverride,
        authorityApproveAward,
        overrideBudgetAndAward,
        resetPasswordWithSecurity,
        acknowledgePO,
        dispatchDelivery,
        receiveDelivery,
        recordPayment,
        toggleMyVendor,
        updateVendorStatus,
        getVendorEffectiveStatus,
        adjustBudget,
        addDepartment,
        deleteDepartment,
        updateDepartment,
        adminApproveUser,
        adminUpdateUserRole,
        adminToggleUserStatus,
        adminResetUserPassword,
        addCategory,
        deactivateCategory,
        reactivateCategory,
        editCategory,
        menuOpen,
        setMenuOpen,
        toggleMenu,
        exportDatabaseJson,
        importDatabaseJson,
        inactivityModalOpen,
        resetInactivityTimer,
        staySignedIn,
        celebrationOpen,
        setCelebrationOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
