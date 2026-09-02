import { useState } from "react";
import {
  getSavedUsers,
  saveSavedUsers,
  type ParentProfile,
  type SavedUser,
} from "../components/authShared";

const emptyParent = (): ParentProfile => ({
  name: "",
  residentFront: "",
  residentBackFirst: "",
  phone: "",
  relation: "",
  address: "",
  consentAt: new Date().toISOString(),
});

function AdminView() {
  const [users, setUsers] = useState<SavedUser[]>(() => getSavedUsers());
  const [selectedId, setSelectedId] = useState<string | null>(
    users[0]?.id ?? null,
  );
  const [toast, setToast] = useState("");

  const selectedUser = users.find((user) => user.id === selectedId) ?? null;

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2000);
  };

  const updateUsers = (next: SavedUser[]) => {
    setUsers(next);
    saveSavedUsers(next);
  };

  const saveUserInfo = (id: string, patch: Partial<SavedUser>) => {
    updateUsers(users.map((user) => (user.id === id ? { ...user, ...patch } : user)));
    showToast("사용자 정보가 저장되었습니다.");
  };

  const saveParentInfo = (id: string, patch: Partial<ParentProfile>) => {
    updateUsers(
      users.map((user) =>
        user.id === id
          ? { ...user, parent: { ...(user.parent ?? emptyParent()), ...patch } }
          : user,
      ),
    );
    showToast("보호자 정보가 저장되었습니다.");
  };

  return (
    <div className="mx-auto max-w-[1400px] p-5 sm:p-8 lg:p-10">
      <p className="mb-2 text-sm font-black text-blue-600">담소 관리자</p>
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">관리자</h1>
      <p className="mt-2 text-sm font-medium text-slate-500 sm:text-base">
        가입된 전체 계정의 사용자·보호자 정보를 조회하고 수정합니다.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-black text-slate-500">
            전체 계정 ({users.length})
          </p>
          <div className="space-y-1.5">
            {users.length === 0 && (
              <p className="p-3 text-sm font-bold text-slate-400">
                가입된 계정이 없습니다.
              </p>
            )}
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => setSelectedId(user.id)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                  selectedId === user.id
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{user.name || user.id}</span>
                <span className="text-xs font-black text-slate-400">
                  {user.accountType === "guardian" ? "보호자" : "사용자"}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="space-y-6">
          {toast && (
            <div className="rounded-2xl bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-700">
              {toast}
            </div>
          )}

          {!selectedUser ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-bold text-slate-400">
              왼쪽에서 계정을 선택해 주세요.
            </div>
          ) : (
            <>
              <UserInfoCard
                key={`user-${selectedUser.id}`}
                user={selectedUser}
                onSave={(patch) => saveUserInfo(selectedUser.id, patch)}
              />
              <ParentInfoCard
                key={`parent-${selectedUser.id}`}
                parent={selectedUser.parent}
                onSave={(patch) => saveParentInfo(selectedUser.id, patch)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function UserInfoCard({
  user,
  onSave,
}: {
  user: SavedUser;
  onSave: (patch: Partial<SavedUser>) => void;
}) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [email, setEmail] = useState(user.email ?? "");
  const [password, setPassword] = useState(user.password);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-black">사용자 정보</h2>
      <p className="mt-1 text-sm font-bold text-slate-400">
        아이디: {user.id} (변경 불가)
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="이름">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="전화번호">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </Field>
        <Field label="이메일">
          <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </Field>
        <Field label="비밀번호">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="text"
            className={inputClass}
          />
        </Field>
      </div>
      <button
        onClick={() => onSave({ name, phone, email, password })}
        className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white"
      >
        사용자 정보 저장
      </button>
    </section>
  );
}

function ParentInfoCard({
  parent,
  onSave,
}: {
  parent?: ParentProfile;
  onSave: (patch: Partial<ParentProfile>) => void;
}) {
  const [name, setName] = useState(parent?.name ?? "");
  const [phone, setPhone] = useState(parent?.phone ?? "");
  const [relation, setRelation] = useState(parent?.relation ?? "");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-black">보호자 정보</h2>
      <p className="mt-1 text-sm font-bold text-slate-400">
        이 계정에 연결된 보호자(피보호인 관리자) 정보를 관리합니다.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="보호자 이름">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="보호자 전화번호">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </Field>
        <Field label="관계">
          <input value={relation} onChange={(e) => setRelation(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <button
        onClick={() => onSave({ name, phone, relation })}
        className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white"
      >
        보호자 정보 저장
      </button>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-black text-slate-600">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold outline-none focus:border-blue-500";

export default AdminView;
