"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth0 } from "@auth0/auth0-react";
import { Compressor, UserData } from "@/lib/types";
import { URL_API } from "@/lib/global";
import { useDialog } from "@/hooks/useDialog";
import {
  Users,
  Building2,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  User,
  CheckCircle2,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */

interface UsuarioAuth {
  id: number;
  email: string;
  numeroCliente: number;
  rol: number;
  name: string;
  envio_diario: boolean;
  envio_semanal: boolean;
  created_at: string;
  nombre_cliente: string | null;
}

interface Ingeniero {
  id: string;
  name: string;
  email: string;
  numero_cliente: number;
  rol?: number;
  compressors: Array<{ id: string; alias: string }> | string[];
  emailPreferences: {
    daily: boolean;
    weekly: boolean;
    monthly: boolean;
  };
}

/** A unified view merging both tables. */
interface DisplayUser {
  authId: number | null;
  engineerId: string | null;
  name: string;
  email: string;
  numero_cliente: number;
  envio_diario: boolean;
  envio_semanal: boolean;
  compressors: string[]; // compresor IDs stored in ingenieros
  compressorAliases: string[]; // human-readable aliases
  emailPreferences: {
    daily: boolean;
    weekly: boolean;
    monthly: boolean;
  };
}

interface FormData {
  name: string;
  email: string;
  compressors: string[]; // compresor IDs
  envio_diario: boolean;
  envio_semanal: boolean;
}

const EMPTY_FORM: FormData = {
  name: "",
  email: "",
  compressors: [],
  envio_diario: false,
  envio_semanal: false,
};

/* ── Helpers ────────────────────────────────────────────────── */

const headers = () => ({
  "Content-Type": "application/json",
  accept: "application/json",
  "x-internal-api-key": process.env.NEXT_PUBLIC_API_SECRET || "",
});

/* ── Component ──────────────────────────────────────────────── */

const AdminView = () => {
  const router = useRouter();
  const { showSuccess, showError, showConfirmation } = useDialog();
  const { isLoading } = useAuth0();

  const [userRole, setUserRole] = useState<number | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [users, setUsers] = useState<DisplayUser[]>([]);
  const [compressors, setCompressors] = useState<Compressor[]>([]);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<DisplayUser | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

  /* ── Auth / bootstrap ─────────────────────────────────────── */

  useEffect(() => {
    if (!isLoading) {
      const stored = sessionStorage.getItem("userData");
      if (stored) {
        const parsed: UserData = JSON.parse(stored);
        setUserData(parsed);
        setUserRole(parsed.rol);
        if (parsed.rol !== 3) {
          router.push("/");
        } else {
          const num = toNum(parsed.numero_cliente);
          fetchAll(num);
        }
      } else {
        router.push("/");
      }
    }
  }, [isLoading, router]);

  const toNum = (v: number | string) =>
    typeof v === "string" ? parseInt(v, 10) : v;

  const clientNum = () => toNum(userData?.numero_cliente ?? 0);

  /* ── Data fetching ────────────────────────────────────────── */

  const fetchAll = async (numero_cliente: number) => {
    setIsLoadingData(true);
    try {
      const [authRes, ingRes, compRes] = await Promise.all([
        fetch(`${URL_API}/web/usuarios-auth/`, { headers: headers() }),
        fetch(`${URL_API}/web/ingenieros?cliente=${numero_cliente}`, {
          headers: headers(),
        }),
        fetch(`${URL_API}/web/compresores?cliente=${numero_cliente}`, {
          headers: headers(),
        }),
      ]);

      const authJson = authRes.ok ? await authRes.json() : { data: [] };
      const ingJson = ingRes.ok ? await ingRes.json() : [];
      const compJson = compRes.ok ? await compRes.json() : [];

      const authList: UsuarioAuth[] = (authJson.data ?? []).filter(
        (u: UsuarioAuth) => u.numeroCliente === numero_cliente
      );
      const ingList: Ingeniero[] = ingJson;
      const compList: Compressor[] = compJson;

      setCompressors(compList);
      setUsers(mergeUsers(authList, ingList, compList));
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  /** Merge usuarios-auth + ingenieros by email into a single list. */
  const mergeUsers = (
    authList: UsuarioAuth[],
    ingList: Ingeniero[],
    compList: Compressor[]
  ): DisplayUser[] => {
    const ingByEmail = new Map(ingList.map((i) => [i.email.toLowerCase(), i]));

    const merged: DisplayUser[] = authList.map((auth) => {
      const ing = ingByEmail.get(auth.email.toLowerCase());
      const compIds = ing ? extractCompressorIds(ing.compressors, compList) : [];
      const compAliases = ing
        ? extractCompressorAliases(ing.compressors, compList)
        : [];
      return {
        authId: auth.id,
        engineerId: ing?.id ?? null,
        name: auth.name,
        email: auth.email,
        numero_cliente: auth.numeroCliente,
        envio_diario: auth.envio_diario,
        envio_semanal: auth.envio_semanal,
        compressors: compIds,
        compressorAliases: compAliases,
        emailPreferences: ing?.emailPreferences ?? {
          daily: auth.envio_diario,
          weekly: auth.envio_semanal,
          monthly: false,
        },
      };
    });

    // Also include any ingenieros NOT present in usuarios-auth
    for (const ing of ingList) {
      if (!authList.find((a) => a.email.toLowerCase() === ing.email.toLowerCase())) {
        const compIds = extractCompressorIds(ing.compressors, compList);
        const compAliases = extractCompressorAliases(ing.compressors, compList);
        merged.push({
          authId: null,
          engineerId: ing.id,
          name: ing.name,
          email: ing.email,
          numero_cliente: ing.numero_cliente,
          envio_diario: ing.emailPreferences?.daily ?? false,
          envio_semanal: ing.emailPreferences?.weekly ?? false,
          compressors: compIds,
          compressorAliases: compAliases,
          emailPreferences: ing.emailPreferences ?? {
            daily: false,
            weekly: false,
            monthly: false,
          },
        });
      }
    }

    return merged;
  };

  const extractCompressorIds = (
    raw: Ingeniero["compressors"],
    compList: Compressor[]
  ): string[] => {
    if (!raw || raw.length === 0) return [];
    if (typeof raw[0] === "object") {
      return (raw as Array<{ id: string; alias: string }>).map((c) => c.id);
    }
    return (raw as string[]).reduce<string[]>((acc, nameOrId) => {
      const found = compList.find(
        (c) => c.alias === nameOrId || String(c.id) === nameOrId
      );
      if (found) acc.push(found.id.toString());
      return acc;
    }, []);
  };

  const extractCompressorAliases = (
    raw: Ingeniero["compressors"],
    compList: Compressor[]
  ): string[] => {
    if (!raw || raw.length === 0) return [];
    if (typeof raw[0] === "object") {
      return (raw as Array<{ id: string; alias: string }>).map((c) => c.alias);
    }
    const strings = raw as string[];
    const matched = compList.filter((c) => strings.includes(c.alias));
    return matched.length > 0 ? matched.map((c) => c.alias) : strings;
  };

  /* ── Modal helpers ────────────────────────────────────────── */

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData(EMPTY_FORM);
    setIsDropdownOpen(false);
    setIsModalOpen(true);
  };

  const openEditModal = (user: DisplayUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      compressors: user.compressors,
      envio_diario: user.envio_diario,
      envio_semanal: user.envio_semanal,
    });
    setIsDropdownOpen(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData(EMPTY_FORM);
    setIsDropdownOpen(false);
  };

  const toggleCompressor = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      compressors: prev.compressors.includes(id)
        ? prev.compressors.filter((c) => c !== id)
        : [...prev.compressors, id],
    }));
  };

  /* ── CRUD ─────────────────────────────────────────────────── */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.numero_cliente) return;
    const num = clientNum();
    setIsSubmitting(true);

    try {
      if (editingUser) {
        await updateUser(editingUser, num);
      } else {
        await createUser(num);
      }
      closeModal();
      await fetchAll(num);
      showSuccess(
        editingUser ? "Usuario actualizado" : "Usuario agregado",
        editingUser
          ? "Los datos han sido actualizados correctamente."
          : "El usuario ha sido agregado exitosamente."
      );
    } catch (err) {
      console.error(err);
      showError("Error al guardar usuario", "Por favor intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const createUser = async (num: number) => {
    // 1. Create in usuarios-auth
    const authPayload = {
      email: formData.email,
      numeroCliente: num,
      rol: 2, // Ingeniero in usuarios-auth
      name: formData.name,
      envio_diario: formData.envio_diario,
      envio_semanal: formData.envio_semanal,
    };
    const authRes = await fetch(`${URL_API}/web/usuarios-auth/`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(authPayload),
    });
    if (!authRes.ok) {
      const err = await authRes.json().catch(() => ({}));
      throw new Error(err.detail || "Error al crear en usuarios-auth");
    }

    // 2. Create in ingenieros (for compressor assignments)
    const ingPayload = {
      name: formData.name,
      email: formData.email,
      compressors: formData.compressors,
      numeroCliente: num,
      rol: 4,
    };
    const ingRes = await fetch(`${URL_API}/web/ingenieros`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(ingPayload),
    });
    if (!ingRes.ok) {
      const err = await ingRes.json().catch(() => ({}));
      throw new Error(err.detail || "Error al crear en ingenieros");
    }
  };

  const updateUser = async (user: DisplayUser, num: number) => {
    const promises: Promise<Response>[] = [];

    // Update in usuarios-auth if present
    if (user.authId !== null) {
      promises.push(
        fetch(`${URL_API}/web/usuarios-auth/${user.authId}`, {
          method: "PUT",
          headers: headers(),
          body: JSON.stringify({
            email: formData.email,
            numeroCliente: num,
            rol: 2,
            name: formData.name,
            envio_diario: formData.envio_diario,
            envio_semanal: formData.envio_semanal,
          }),
        })
      );
    }

    // Update/create in ingenieros for compressor assignments
    if (user.engineerId !== null) {
      promises.push(
        fetch(`${URL_API}/web/ingenieros/${user.engineerId}`, {
          method: "PUT",
          headers: headers(),
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            compressors: formData.compressors,
            numeroCliente: num,
            rol: 4,
          }),
        })
      );
    } else {
      // User exists only in auth — also create them in ingenieros
      promises.push(
        fetch(`${URL_API}/web/ingenieros`, {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            compressors: formData.compressors,
            numeroCliente: num,
            rol: 4,
          }),
        })
      );
    }

    const results = await Promise.all(promises);
    for (const res of results) {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
    }
  };

  const handleDelete = (user: DisplayUser) => {
    const num = clientNum();
    showConfirmation(
      "Eliminar usuario",
      `¿Estás seguro de que quieres eliminar a ${user.name}? Esta acción no se puede deshacer.`,
      async () => {
        try {
          const deletes: Promise<Response>[] = [];

          if (user.authId !== null) {
            deletes.push(
              fetch(`${URL_API}/web/usuarios-auth/${user.authId}`, {
                method: "DELETE",
                headers: headers(),
              })
            );
          }

          if (user.engineerId !== null) {
            deletes.push(
              fetch(
                `${URL_API}/web/ingenieros/${user.engineerId}?cliente=${num}`,
                {
                  method: "DELETE",
                  headers: headers(),
                }
              )
            );
          }

          const results = await Promise.all(deletes);
          if (results.every((r) => r.ok)) {
            await fetchAll(num);
            showSuccess(
              "Usuario eliminado",
              "El usuario ha sido eliminado exitosamente."
            );
          } else {
            showError("Error al eliminar", "No se pudo eliminar el usuario.");
          }
        } catch {
          showError("Error al eliminar", "Por favor intenta de nuevo.");
        }
      },
      undefined,
      "Eliminar",
      "Cancelar"
    );
  };

  const handleEmailPreference = async (
    user: DisplayUser,
    preference: "daily" | "weekly" | "monthly",
    value: boolean
  ) => {
    const updates: Promise<Response>[] = [];

    // Update in ingenieros preferences
    if (user.engineerId !== null) {
      updates.push(
        fetch(`${URL_API}/web/ingenieros/${user.engineerId}/preferences`, {
          method: "PATCH",
          headers: headers(),
          body: JSON.stringify({ [preference]: value }),
        })
      );
    }

    // Sync envio_diario / envio_semanal to usuarios-auth
    if (user.authId !== null && (preference === "daily" || preference === "weekly")) {
      updates.push(
        fetch(`${URL_API}/web/usuarios-auth/${user.authId}`, {
          method: "PUT",
          headers: headers(),
          body: JSON.stringify({
            email: user.email,
            numeroCliente: user.numero_cliente,
            rol: 2,
            name: user.name,
            envio_diario: preference === "daily" ? value : user.envio_diario,
            envio_semanal:
              preference === "weekly" ? value : user.envio_semanal,
          }),
        })
      );
    }

    await Promise.all(updates);

    // Optimistic update
    setUsers((prev) =>
      prev.map((u) =>
        u.email === user.email
          ? {
              ...u,
              emailPreferences: { ...u.emailPreferences, [preference]: value },
              envio_diario:
                preference === "daily" ? value : u.envio_diario,
              envio_semanal:
                preference === "weekly" ? value : u.envio_semanal,
            }
          : u
      )
    );
  };

  /* ── Render ───────────────────────────────────────────────── */

  if (isLoading || userRole !== 3) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
      </div>
    );
  }

  const totalAssigned = users.reduce(
    (acc, u) => acc + u.compressors.length,
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Panel de Administración
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Bienvenido,{" "}
              <span className="font-semibold text-blue-700">
                {userData?.name}
              </span>
              . Gestiona los accesos de tu empresa.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm text-sm"
          >
            <Plus className="h-4 w-4" />
            Agregar Usuario
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Usuarios registrados</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <Building2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Compresores disponibles</p>
              <p className="text-2xl font-bold text-gray-900">
                {compressors.length}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Asignaciones totales</p>
              <p className="text-2xl font-bold text-gray-900">{totalAssigned}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">
            Usuarios de la empresa
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Administra qué compresores puede ver cada usuario.
          </p>
        </div>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <div className="p-4 bg-gray-100 rounded-full mb-4">
              <Users className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-700">
              Sin usuarios registrados
            </h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">
              Todavía no hay usuarios para este cliente. Haz clic en "Agregar
              Usuario" para comenzar.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              <Plus className="h-4 w-4" />
              Agregar primer usuario
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Compresores asignados
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Reportes por correo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr
                    key={user.email}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {/* Name + email */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-blue-700">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">
                        <User className="h-3 w-3" />
                        Usuario
                      </span>
                    </td>

                    {/* Compressor chips */}
                    <td className="px-6 py-4">
                      {user.compressorAliases.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">
                          Sin compresores asignados
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {user.compressorAliases.slice(0, 3).map((alias, i) => (
                            <span
                              key={i}
                              className="inline-block px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-medium"
                            >
                              {alias}
                            </span>
                          ))}
                          {user.compressorAliases.length > 3 && (
                            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              +{user.compressorAliases.length - 3} más
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Email preferences */}
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-5">
                        {(
                          [
                            { key: "daily", label: "Diario" },
                            { key: "weekly", label: "Semanal" },
                            { key: "monthly", label: "Mensual" },
                          ] as const
                        ).map(({ key, label }) => (
                          <label
                            key={key}
                            className="flex flex-col items-center gap-1 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              checked={user.emailPreferences?.[key] || false}
                              onChange={(e) =>
                                handleEmailPreference(user, key, e.target.checked)
                              }
                            />
                            <span className="text-xs text-gray-500">{label}</span>
                          </label>
                        ))}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {editingUser ? "Editar Usuario" : "Agregar Usuario"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingUser
                    ? `Editando a ${editingUser.name}`
                    : "Completa los datos del nuevo usuario"}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nombre completo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  placeholder="correo@empresa.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              {/* Compressor multi-select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Compresores con acceso
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen((v) => !v)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white text-left flex justify-between items-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <span
                      className={
                        formData.compressors.length === 0
                          ? "text-gray-400"
                          : "text-gray-900"
                      }
                    >
                      {formData.compressors.length === 0
                        ? "Seleccionar compresores..."
                        : `${formData.compressors.length} compresor${formData.compressors.length > 1 ? "es" : ""} seleccionado${formData.compressors.length > 1 ? "s" : ""}`}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-auto">
                      {compressors.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No hay compresores disponibles
                        </div>
                      ) : (
                        compressors.map((comp) => {
                          const selected = formData.compressors.includes(
                            comp.id.toString()
                          );
                          return (
                            <label
                              key={comp.id}
                              className={`flex items-center px-4 py-2.5 cursor-pointer transition-colors ${selected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() =>
                                  toggleCompressor(comp.id.toString())
                                }
                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              />
                              <div className="ml-3">
                                <span className="text-sm font-medium text-gray-900">
                                  {comp.alias}
                                </span>
                                <span className="text-xs text-gray-400 ml-2">
                                  Línea {comp.linea}
                                </span>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Selected compressor chips */}
                {formData.compressors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formData.compressors.map((id) => {
                      const comp = compressors.find(
                        (c) => c.id.toString() === id
                      );
                      return comp ? (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-medium"
                        >
                          {comp.alias}
                          <button
                            type="button"
                            onClick={() => toggleCompressor(id)}
                            className="ml-0.5 hover:text-blue-900"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {/* Email preferences in modal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reportes por correo
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.envio_diario}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          envio_diario: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">Diario</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.envio_semanal}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          envio_semanal: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">Semanal</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Guardando...
                    </>
                  ) : editingUser ? (
                    "Guardar cambios"
                  ) : (
                    "Agregar usuario"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Backdrop to close compressor dropdown when outside modal */}
      {isDropdownOpen && !isModalOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminView;
