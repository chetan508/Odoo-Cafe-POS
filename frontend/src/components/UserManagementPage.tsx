import React, { useState } from "react";
import { User } from "../types";
import { Plus, Trash2, Edit2, Eye, EyeOff, Users, Coffee, MonitorPlay, ArrowLeft } from "lucide-react";
import BrandLogo from "./common/BrandLogo";

interface UserManagementPageProps {
  currentUser: User;
  employees: User[];
  onAddEmployee: (emp: any) => Promise<User>;
  onEditEmployee: (id: string, emp: any) => Promise<User>;
  onDeleteEmployee: (id: string) => Promise<void>;
  onBack: () => void;
}

export default function UserManagementPage({
  currentUser,
  employees,
  onAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onBack,
}: UserManagementPageProps) {
  const [activeEditingId, setActiveEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [empForm, setEmpForm] = useState({
    name: "",
    email: "",
    password: "",
    role: currentUser.role, // Automatically locked to creator's role
  });

  // Filter user list based on role
  // Cashier can only see Cashier users; Kitchen can only see Kitchen users.
  const filteredUsers = employees.filter((emp) => {
    if (currentUser.role === "cashier") {
      return emp.role === "cashier";
    }
    if (currentUser.role === "kitchen") {
      return emp.role === "kitchen";
    }
    return false;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeEditingId === "new_emp") {
        await onAddEmployee({
          ...empForm,
          role: currentUser.role, // Force role on submission
        });
        alert("User account created successfully.");
      } else if (activeEditingId) {
        const targetId = activeEditingId.replace("edit_emp_", "");
        await onEditEmployee(targetId, {
          name: empForm.name,
          email: empForm.email,
          password: empForm.password || undefined,
          role: currentUser.role,
        });
        alert("User account updated successfully.");
      }
      setActiveEditingId(null);
      setEmpForm({ name: "", email: "", password: "", role: currentUser.role });
    } catch (err: any) {
      alert(err.message || "Failed to save user account details.");
    }
  };

  const handleEditClick = (emp: User) => {
    setActiveEditingId(`edit_emp_${emp.id}`);
    setEmpForm({
      name: emp.name,
      email: emp.email,
      password: "", // Optional on edit
      role: emp.role,
    });
    setShowPassword(false);
  };

  const handleCreateClick = () => {
    setActiveEditingId("new_emp");
    setEmpForm({
      name: "",
      email: "",
      password: "",
      role: currentUser.role,
    });
    setShowPassword(false);
  };

  const formatAuditLog = (emp: User) => {
    if (emp.createdBy && emp.createdRole) {
      return `${emp.createdRole} ${emp.createdBy} created ${emp.role.charAt(0).toUpperCase() + emp.role.slice(1)} ${emp.name}.`;
    }
    return `System initialized account.`;
  };

  const roleTitle = currentUser.role === "cashier" ? "Cashier Users" : "Kitchen Staff Users";
  const portalIcon = <BrandLogo size="md" />;

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-[#FAF7F2]/50 min-h-[85vh] animate-fade-in">
      <header className="flex justify-between items-center mb-8 border-b border-[#E6DDD2] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-xl border border-[#E6DDD2] bg-white p-2.5 text-[#6F4E37] hover:bg-[#F5EFE6] transition cursor-pointer"
            title="Return to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              {portalIcon}
              <h2 className="font-display text-2xl font-black text-[#3E2723]">User Management</h2>
            </div>
            <p className="text-xs text-[#6F4E37] font-semibold mt-0.5">
              Manage accounts for {roleTitle}. You can create and edit {currentUser.role} accounts only.
            </p>
          </div>
        </div>

        {!activeEditingId && (
          <button
            onClick={handleCreateClick}
            className="rounded-xl bg-[#6F4E37] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#3E2723] flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add User Account
          </button>
        )}
      </header>

      {activeEditingId && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-2xl border border-[#E6DDD2] space-y-4 shadow-sm max-w-2xl mb-8"
        >
          <h3 className="font-display font-black text-sm text-[#3E2723] uppercase tracking-wide">
            {activeEditingId === "new_emp" ? `Create New ${roleTitle.slice(0, -1)}` : `Edit ${roleTitle.slice(0, -1)}`}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase">User Name *</label>
              <input
                type="text"
                required
                value={empForm.name}
                onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                placeholder="John Doe"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#6F4E37]"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase">Email Address *</label>
              <input
                type="email"
                required
                value={empForm.email}
                onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                placeholder="user@cafeodoo.com"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#6F4E37]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">
                Password {activeEditingId === "new_emp" ? "*" : "(leave blank to keep current)"}
              </label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  required={activeEditingId === "new_emp"}
                  value={empForm.password}
                  onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })}
                  placeholder="Min 6 characters..."
                  className="w-full rounded-xl border border-gray-200 pl-3 pr-10 py-2 text-xs outline-none focus:border-[#6F4E37]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#6F4E37] transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveEditingId(null)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-[#6F4E37] hover:bg-[#FAF7F2] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#6F4E37] px-4 py-2 text-xs font-bold text-white hover:bg-[#3E2723] cursor-pointer"
            >
              {activeEditingId === "new_emp" ? "Create User" : "Update User"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-[#E6DDD2] shadow-sm p-6">
        <h4 className="text-xs font-bold text-[#3E2723] uppercase tracking-wider mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-[#6F4E37]" />
          Active Accounts ({filteredUsers.length})
        </h4>

        <div className="space-y-4">
          {filteredUsers.map((emp) => (
            <div
              key={emp.id}
              className="p-4 rounded-xl border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/10 hover:border-[#E6DDD2] transition-colors duration-200"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-gray-800">{emp.name}</span>
                  <span className="rounded bg-[#FAF7F2] px-1.5 py-0.5 text-[9px] uppercase font-bold text-[#3E2723]">
                    {emp.role}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono block">{emp.email}</span>
                <span className="text-[9px] text-[#6F4E37]/80 font-medium block italic mt-1">
                  {formatAuditLog(emp)}
                </span>
              </div>

              <div className="flex items-center gap-1 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleEditClick(emp)}
                  className="px-2.5 py-1.5 bg-white border border-gray-200 hover:bg-[#FAF7F2] text-[10px] font-bold text-[#6F4E37] rounded-lg cursor-pointer transition"
                >
                  Edit
                </button>

                {emp.status === "active" ? (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await onEditEmployee(emp.id, { status: "archived" });
                      } catch (err: any) {
                        alert(err.message || "Failed to archive user.");
                      }
                    }}
                    className="p-1 px-2.5 rounded text-[10px] font-bold hover:bg-amber-50 text-amber-600 cursor-pointer"
                  >
                    Archive
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await onEditEmployee(emp.id, { status: "active" });
                      } catch (err: any) {
                        alert(err.message || "Failed to activate user.");
                      }
                    }}
                    className="p-1 px-2.5 rounded text-[10px] font-bold hover:bg-green-50 text-green-600 cursor-pointer"
                  >
                    Activate
                  </button>
                )}

                {currentUser.id !== emp.id && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm(`Are you sure you want to permanently delete user ${emp.name}?`)) {
                        try {
                          await onDeleteEmployee(emp.id);
                        } catch (err: any) {
                          alert(err.message || "Failed to delete user.");
                        }
                      }
                    }}
                    className="p-1 px-1.5 rounded hover:bg-rose-50 text-rose-600 cursor-pointer transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-xs">
              No active {currentUser.role} accounts found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
