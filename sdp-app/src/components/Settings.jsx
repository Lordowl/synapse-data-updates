// src/components/Settings/Settings.jsx
import { useState, useMemo, useEffect } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext"; // Importa l'hook
import apiClient from "../api/apiClient"; //
import { open as openDialog } from "@tauri-apps/plugin-dialog";

import {
  Settings as SettingsIcon,
  // FileText, // Non più usata direttamente, Database è usata per il tab metadati
  Users,
  Database,
  Edit,
  ExternalLink,
  Save,
  Upload,
  Plus,
  Trash2,
  RefreshCw,
  ListChecks,
  Download,
  Search, // Per la barra di ricerca nei permessi
  // Filter as FilterIcon, // Non più usata se usiamo Search + Select
} from "lucide-react";
import "./Settings.css";

// =================================================================================
// --- DEFINIZIONE DEI SOTTO-COMPONENTI PER I TAB (PRIMA DEL COMPONENTE SETTINGS) ---
// =================================================================================

// --- Sotto-Componente per il Tab "File Metadati" ---
function MetadataFileTabContent({
  metadataFilePath,
  setMetadataFilePath,
  onOpenSharePoint,
  onSave,
  isSaving,
  onLoadFromFile,
}) {
  return (
    <div className="tab-content-padding">
      <div className="tab-content-header">
        <Database className="tab-content-icon" />
        <h2 className="tab-content-title">Gestione File Metadati</h2>
      </div>
      <div className="metadata-grid">
        <div className="metadata-card">
          <div className="metadata-card-header">
            <div className="metadata-card-icon-bg metadata-card-icon-bg-green">
              <Database className="metadata-card-icon metadata-card-icon-green" />
            </div>
            <h3 className="metadata-card-title">File Sorgente Metadati</h3>
          </div>
          <p className="metadata-card-description">
            Configura il percorso del file principale dei metadati (es. .xlsx,
            .csv).
          </p>
          <input
            type="text"
            value={metadataFilePath}
            onChange={(e) => setMetadataFilePath(e.target.value)}
            placeholder="Percorso file metadati"
            className="form-input"
            disabled={isSaving}
          />
          <div className="metadata-card-input-group">
            <button
              onClick={() => onOpenSharePoint("metadata_file")}
              className="btn btn-outline w-full"
              disabled={isSaving}
            >
              <ExternalLink className="btn-icon-md" /> Apri SharePoint
            </button>
            <button
              onClick={onLoadFromFile} // Assegna la funzione all'evento onClick
              className="btn btn-outline w-full"
              disabled={isSaving}
            >
              <Upload className="btn-icon-md" /> Carica File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Sotto-Componente per il Tab Log Applicativi ---
function LogsTabContent({ logEntries, onRefreshLogs, onDownloadLogs }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredLogs = useMemo(() => {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate
      ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
      : null;

    if (!logEntries) return [];

    return logEntries
      .filter((log) => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        const matchesSearch =
          log.action?.toLowerCase().includes(lowerSearchTerm) ||
          log.username?.toLowerCase().includes(lowerSearchTerm) ||
          JSON.stringify(log.details)?.toLowerCase().includes(lowerSearchTerm);
        const logDate = new Date(log.timestamp);
        const matchesStartDate = !start || logDate >= start;
        const matchesEndDate = !end || logDate <= end;
        return matchesSearch && matchesStartDate && matchesEndDate;
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [logEntries, searchTerm, startDate, endDate]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="tab-content-padding">
      {/* INTESTAZIONE */}
      <div className="tab-content-header">
        <ListChecks className="tab-content-icon" />
        <h2 className="tab-content-title">Registro Attività (Audit Log)</h2>
      </div>

      {/* BARRA DEI FILTRI */}
      <div className="logs-controls-grid">
        <div className="search-input-wrapper">
          <Search className="search-input-icon" />
          <input
            type="text"
            placeholder="Cerca per azione, utente, dettagli..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
          />
        </div>
        <div className="date-filter-group">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="form-input"
            title="Data di inizio"
          />
          <span>-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="form-input"
            title="Data di fine"
          />
        </div>
        <div className="action-buttons-group">
          <button
            onClick={handleClearFilters}
            className="btn btn-outline"
            title="Resetta tutti i filtri"
          >
            <RefreshCw className="btn-icon-sm" /> Pulisci Filtri
          </button>
          <button
            onClick={onRefreshLogs}
            className="btn btn-outline"
            title="Ricarica i dati dal server"
          >
            <RefreshCw className="btn-icon-sm" /> Aggiorna
          </button>
        </div>
      </div>

      {/* TABELLA DEI LOG */}
      <div className="permissions-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th style={{ width: "15%" }}>Data e Ora</th>
              <th style={{ width: "15%" }}>Utente</th>
              <th style={{ width: "20%" }}>Azione</th>
              <th>Dettagli</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td data-label="Data e Ora">
                    <div className="date-primary">
                      {new Date(log.timestamp).toLocaleDateString("it-IT")}
                    </div>
                    <div className="date-secondary">
                      {new Date(log.timestamp).toLocaleTimeString("it-IT")}
                    </div>
                  </td>
                  <td data-label="Utente">{log.username || "Sistema"}</td>
                  <td data-label="Azione">
                    <span className="action-badge">{log.action}</span>
                  </td>
                  <td data-label="Dettagli">
                    {log.details ? (
                      <pre className="details-pre">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    ) : (
                      <span className="muted-text">Nessun dettaglio</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="empty-state-cell">
                  Nessun registro attività trovato per i filtri selezionati.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="logs-actions">
        <p className="logs-count-info">
          Visualizzati: {filteredLogs.length} (Totali: {logEntries?.length || 0}
          )
        </p>

        <button
          onClick={() => onDownloadLogs(filteredLogs)}
          className="btn btn-outline"
        >
          <Download className="btn-icon-md" /> Scarica Risultati
        </button>
      </div>
    </div>
  );
}
// --- Sotto-Componente per il Tab Permessi (MODIFICATO) ---
const ALL_ACCESS_MODULES = [
  // Definisci i moduli a cui si può dare accesso
  { id: "ingest", label: "Ingest" },
  { id: "report", label: "Report" },
  { id: "settings", label: "Settings" }, // Accesso alle impostazioni
];

function PermissionsTabContent({
  permissions,
  onPermissionChange,
  onAddNew,
  onRemove,
  onSave,
  isSaving,
  hasUnsavedChanges,
  loadingStates,
  // Nuove props per filtri e ricerca
  searchTerm,
  setSearchTerm,
  roleFilter,
  setRoleFilter,
  accessFilter, // <<--- NUOVO: filtro per tipo di accesso
  setAccessFilter, // <<--- NUOVO: setter per filtro accesso
  availableRoles,
}) {
  const [selectedPermissionIds, setSelectedPermissionIds] = useState(new Set());

  const filteredPermissions = useMemo(() => {
    return permissions.filter((perm) => {
      const matchesSearch = perm.user
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === "all" || perm.role === roleFilter;
      const matchesAccess =
        accessFilter === "all" ||
        (perm.accessTo && perm.accessTo.includes(accessFilter));
      return matchesSearch && matchesRole && matchesAccess;
    });
  }, [permissions, searchTerm, roleFilter, accessFilter]);

  const handleAccessToChange = (permId, accessType, checked) => {
    onPermissionChange(permId, "accessTo", (currentAccessTo = []) => {
      if (checked) {
        return [...new Set([...currentAccessTo, accessType])];
      } else {
        return currentAccessTo.filter((type) => type !== accessType);
      }
    });
  };

  const handleSelectPermission = (permId) => {
    setSelectedPermissionIds((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(permId)) newSelection.delete(permId);
      else newSelection.add(permId);
      return newSelection;
    });
  };

  const handleSelectAllPermissions = (e) => {
    if (e.target.checked) {
      setSelectedPermissionIds(new Set(filteredPermissions.map((p) => p.id)));
    } else {
      setSelectedPermissionIds(new Set());
    }
  };

  const anyActionLoading =
    isSaving || loadingStates.removingPermissionId !== null;

  return (
    <div className="tab-content-padding">
      <div className="permissions-header">
        <div className="permissions-header-title-group">
          <Users className="tab-content-icon" />
          <h2 className="tab-content-title">Gestione Permessi Utente</h2>
        </div>
        <div className="permissions-header-actions">
          <button
            onClick={onAddNew}
            className="btn btn-outline"
            disabled={anyActionLoading}
          >
            <Plus className="btn-icon-md" /> Nuovo Utente
          </button>
        </div>
      </div>

      <div className="permissions-controls-bar">
        <div className="search-input-wrapper">
          <Search className="search-input-icon" />
          <input
            type="text"
            placeholder="Cerca utente per email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            disabled={anyActionLoading}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="form-select"
          disabled={anyActionLoading}
        >
          <option value="all">Tutti i Ruoli</option>
          {availableRoles
            .filter((r) => r !== "all")
            .map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
        </select>
        <select
          value={accessFilter}
          onChange={(e) => setAccessFilter(e.target.value)}
          className="form-select"
          disabled={anyActionLoading}
        >
          <option value="all">Tutti gli Accessi</option>
          {ALL_ACCESS_MODULES.map((module) => (
            <option key={module.id} value={module.id}>
              {module.label}
            </option>
          ))}
        </select>
      </div>

      <div className="permissions-table-wrapper">
        <table className="permissions-table">
          <thead>
            <tr>
              <th>Utente</th>
              <th>Ruolo</th>
              <th>Accesso Moduli</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filteredPermissions.map((perm) => (
              <tr
                key={perm.id}
                className={
                  selectedPermissionIds.has(perm.id) ? "selected-row" : ""
                }
              >
                <td>
                  <input
                    type="email"
                    value={perm.user}
                    onChange={(e) =>
                      onPermissionChange(perm.id, "user", e.target.value)
                    }
                    className="form-input"
                    placeholder="email@company.com"
                    disabled={
                      anyActionLoading ||
                      loadingStates.removingPermissionId === perm.id
                    }
                  />
                </td>
                <td>
                  <select
                    value={perm.role}
                    onChange={(e) =>
                      onPermissionChange(perm.id, "role", e.target.value)
                    }
                    className="form-select"
                    disabled={
                      anyActionLoading ||
                      loadingStates.removingPermissionId === perm.id
                    }
                  >
                    {availableRoles
                      .filter((r) => r !== "all")
                      .map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                  </select>
                </td>
                <td className="permissions-access-to-cell">
                  {ALL_ACCESS_MODULES.map((module) => (
                    <label key={module.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        className="form-checkbox-sm"
                        checked={perm.accessTo?.includes(module.id) || false}
                        onChange={(e) =>
                          handleAccessToChange(
                            perm.id,
                            module.id,
                            e.target.checked
                          )
                        }
                        disabled={
                          anyActionLoading ||
                          loadingStates.removingPermissionId === perm.id
                        }
                      />
                      {module.label}
                    </label>
                  ))}
                </td>
                <td>
                  <button
                    onClick={() => onRemove(perm.id)}
                    className="btn btn-outline"
                    disabled={
                      anyActionLoading ||
                      loadingStates.removingPermissionId === perm.id
                    }
                  >
                    {loadingStates.removingPermissionId === perm.id ? (
                      <RefreshCw className="btn-icon-sm animate-spin-css" />
                    ) : (
                      <Trash2 className="btn-icon-sm" />
                    )}{" "}
                    Rimuovi
                  </button>
                </td>
              </tr>
            ))}
            {filteredPermissions.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center muted-text">
                  Nessun utente trovato per i filtri applicati.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="permissions-footer">
        <p className="permissions-footer-count">
          Utenti visualizzati: {filteredPermissions.length} (Totali:{" "}
          {permissions.length})
        </p>

        {/* --- ECCO LA MODIFICA PER L'INDICATORE --- */}
        <div className="save-actions-wrapper">
          {hasUnsavedChanges && (
            <span className="unsaved-indicator">Modifiche non salvate</span>
          )}
          <button
            onClick={onSave}
            className="btn btn-outline"
            // Disabilita il pulsante se non ci sono modifiche da salvare
            disabled={anyActionLoading || !hasUnsavedChanges}
          >
            {isSaving ? (
              <>
                <RefreshCw className="btn-icon-md animate-spin-css" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="btn-icon-md" />
                Salva Permessi
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Sotto-Componente per il Tab Config File ---
function ConfigFileTabContent({
  content,
  setContent,
  onOpenSharePoint,
  onReset,
  onSave,
  isSaving,
  loadingStates,
}) {
  const anyConfigActionLoading = isSaving || loadingStates.loadingConfigFile;
  return (
    <div className="tab-content-padding">
      <div className="config-file-header">
        <div className="config-file-header-title-group">
          <Edit className="tab-content-icon" />
          <h2 className="tab-content-title">Editor File Config</h2>
        </div>
        <button
          onClick={() => onOpenSharePoint("config_file_load")}
          className="btn btn-outline"
          disabled={anyConfigActionLoading}
        >
          {loadingStates.loadingConfigFile ? (
            <>
              <RefreshCw className="btn-icon-md animate-spin-css" />
              Caricando...
            </>
          ) : (
            <>
              <ExternalLink className="btn-icon-md" />
              Carica da SharePoint
            </>
          )}
        </button>
      </div>
      <div className="config-file-editor-container">
        {/* ... (contenuto editor) ... */}
        <div className="config-file-editor-topbar">
          <div className="config-file-editor-controls">
            <div className="config-file-editor-dots">
              <div className="config-file-editor-dot config-file-editor-dot-red"></div>
              <div className="config-file-editor-dot config-file-editor-dot-yellow"></div>
              <div className="config-file-editor-dot config-file-editor-dot-green"></div>
            </div>
            <span className="config-file-editor-filename">config.ini</span>
          </div>
          <div className="config-file-editor-last-modified hidden md:block">
            Mod: {new Date().toLocaleTimeString()}
          </div>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="config-file-editor-textarea"
          disabled={anyConfigActionLoading}
        />
      </div>
      <div className="config-file-actions">
        <button
          onClick={onSave}
          className="btn btn-outline"
          disabled={anyConfigActionLoading}
        >
          {isSaving ? (
            <>
              <RefreshCw className="btn-icon-md animate-spin-css" />
              Salvataggio...
            </>
          ) : (
            <>
              <Save className="btn-icon-md" />
              Salva Config
            </>
          )}
        </button>
        <button
          onClick={onReset}
          className="btn btn-outline"
          disabled={anyConfigActionLoading}
        >
          <RefreshCw className="btn-icon-md" /> Ripristina Default
        </button>
        <p className="config-file-autosave-text hidden md:block">
          Auto-save ogni 30s
        </p>
      </div>
    </div>
  );
}

function CreateUserModal({
  isOpen,
  onClose,
  newUser,
  setNewUser,
  onCreate,
  error,
  isCreating,
}) {
  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({ ...prev, [name]: value }));
  };

  const generatePassword = () => {
    // Semplice generatore di password lato client (meno sicuro di quello server-side,
    // ma utile per pre-compilare il campo).
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Aggiorna lo stato newUser con la password generata
    setNewUser((prev) => ({ ...prev, password: password }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Crea Nuovo Utente</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={newUser.username}
              onChange={handleChange}
              required
              disabled={isCreating}
              placeholder="es. m.rossi"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={newUser.email}
              onChange={handleChange}
              required
              disabled={isCreating}
              placeholder="es. mario.rossi@azienda.it"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Password (lasciare vuoto per generarla automaticamente)
            </label>
            <div className="password-input-group">
              <input
                type="text" // 'text' per vedere la password generata
                id="password"
                name="password"
                value={newUser.password}
                onChange={handleChange}
                disabled={isCreating}
                placeholder="Opzionale"
              />
              <button
                type="button"
                onClick={generatePassword}
                className="btn btn-outline"
                style={{ flexShrink: 0 }} // Evita che il pulsante si restringa
                disabled={isCreating}
              >
                Genera
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="role">Ruolo</label>
            <select
              id="role"
              name="role"
              value={newUser.role}
              onChange={handleChange}
              disabled={isCreating}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Mostra un eventuale errore di creazione dall'API */}
          {error && <p className="error-message">{error}</p>}

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={isCreating}
            >
              Annulla
            </button>
            <button type="submit" className="btn" disabled={isCreating}>
              {isCreating ? "Creazione in corso..." : "Crea Utente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
// =====================================================
// --- COMPONENTE PRINCIPALE SETTINGS (VERSIONE COMPLETA E MODIFICATA) ---
// =====================================================
function Settings() {
  const navigate = useNavigate();
  const { metadataFilePath, setMetadataFilePath } = useAppContext();
  // --- STATI PRINCIPALI ---
  // Stato per l'utente loggato e per il caricamento dei suoi dati
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Stato per il tab attivo. Default su un tab accessibile a tutti.
  const [activeTab, setActiveTab] = useState("metadata_file");

  // Tutti gli altri tuoi stati originali rimangono qui

  const [permissions, setPermissions] = useState([]);
  const [iniContent, setIniContent] = useState(
    `[Database]\nhost=localhost\nport=5432\n\n[SharePoint]\nsite_url=https://company.sharepoint.com\n\n[Scripts]\npath=/scripts/auto.ps1`
  );
  const [logEntries, setLogEntries] = useState([]);

  // Stati per i filtri dei permessi
  const [permissionSearchTerm, setPermissionSearchTerm] = useState("");
  const [permissionRoleFilter, setPermissionRoleFilter] = useState("all");
  const [permissionAccessFilter, setPermissionAccessFilter] = useState("all");

  const AVAILABLE_ROLES_FOR_FILTER = useMemo(
    () => ["all", ...new Set(permissions.map((p) => p.role))],
    [permissions]
  );

  const [loadingStates, setLoadingStates] = useState({
    savingMetadataFile: false,
    savingPermissions: false,
    savingConfig: false,
    removingPermissionId: null,
    loadingConfigFile: false,
    refreshingLogs: false,
    clearingLogs: false,
    downloadingLogs: false,
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "user", // Ruolo di default
  });
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // --- LOGICA DI AUTENTICAZIONE E PERMESSI ---
  useEffect(() => {
    const fetchInitialData = async () => {
      setAuthLoading(true);
      try {
        // La chiamata a /users/me è fondamentale, la lasciamo qui
        const userResponse = await apiClient.get("/users/me");
        const user = userResponse.data;
        setCurrentUser(user);

        if (user && user.role === "admin") {
          // Usiamo Promise.allSettled invece di Promise.all
          // Promise.all si ferma al primo errore.
          // Promise.allSettled esegue tutte le promise e ci dà il risultato di ciascuna.
          const results = await Promise.allSettled([
            apiClient.get("/users/all"),
            apiClient.get("/audit/logs"),
          ]);

          const permissionsResult = results[0];
          const auditLogsResult = results[1];

          // Gestiamo i permessi
          if (permissionsResult.status === "fulfilled") {
            const formattedPermissions = permissionsResult.value.data.map(
              (dbUser) => ({
                id: dbUser.id,
                user: dbUser.email || dbUser.username,
                role: dbUser.role,
                accessTo: dbUser.permissions || [],
              })
            );
            setPermissions(formattedPermissions);
          } else {
            console.error(
              "Fallito il caricamento dei permessi:",
              permissionsResult.reason
            );
            toast.error("Impossibile caricare la lista utenti.");
          }

          // Gestiamo i log di audit
          if (auditLogsResult.status === "fulfilled") {
            setLogEntries(auditLogsResult.value.data);
          } else {
            console.error(
              "Fallito il caricamento dei log di audit:",
              auditLogsResult.reason
            );
            toast.error("Impossibile caricare il registro attività.");
          }
        }
      } catch (error) {
        // Questo catch ora si attiverà solo se la prima chiamata a /users/me fallisce
        console.error("Errore di autenticazione:", error);
        navigate("/login");
      } finally {
        setAuthLoading(false);
      }
    };

    fetchInitialData();
  }, [navigate]);

  // --- GESTIONE DINAMICA DEI TAB ---
  const TABS = useMemo(() => {
    const baseTabs = [
      {
        id: "metadata_file",
        label: "File Metadati",
        icon: Database,
        description: "Percorso file metadati",
      },
      {
        id: "config",
        label: "Config File",
        icon: Edit,
        description: "Editor file .ini",
      },
      {
        id: "logs",
        label: "Log",
        icon: ListChecks,
        description: "Visualizza log applicativi",
      },
    ];

    if (currentUser && currentUser.role === "admin") {
      // Inserisce il tab dei permessi in una posizione specifica se l'utente è admin
      const adminTab = {
        id: "permissions",
        label: "Permessi",
        icon: Users,
        description: "Gestione accessi utenti",
      };
      // Esempio: inserisce il tab dei permessi come terza posizione
      const finalTabs = [...baseTabs];
      finalTabs.splice(2, 0, adminTab);
      return finalTabs;
    }

    return baseTabs;
  }, [currentUser]);

  // Effetto di sicurezza: se un non-admin finisce sul tab dei permessi, lo sposta
  useEffect(() => {
    if (
      currentUser &&
      currentUser.role !== "admin" &&
      activeTab === "permissions"
    ) {
      setActiveTab("metadata_file"); // Sposta al primo tab di default
    }
  }, [currentUser, activeTab]);
  const openCreateModal = () => {
    // Resetta i campi prima di aprire
    setNewUser({ username: "", email: "", password: "", role: "user" });
    setCreateError("");
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleCreateUser = async () => {
    setIsCreating(true);
    setCreateError("");
    try {
      // Chiamata API REALE per creare l'utente
      const response = await apiClient.post("/users/", newUser);

      // Formatta il nuovo utente per aggiungerlo alla lista visualizzata
      const createdUser = response.data;
      const formattedNewUser = {
        id: createdUser.id,
        user: createdUser.email || createdUser.username,
        role: createdUser.role,
        accessTo: createdUser.permissions || [],
      };

      // Aggiunge il nuovo utente in cima alla lista esistente
      setPermissions((prev) => [formattedNewUser, ...prev]);
      toast.success("Utente creato con successo!");
      closeCreateModal(); // Chiude la modale
    } catch (error) {
      console.error("Errore nella creazione dell'utente:", error);
      setCreateError(
        error.response?.data?.detail || "Impossibile creare l'utente."
      );
    } finally {
      setIsCreating(false);
    }
  };

  // --- GESTIONE DEGLI EVENTI (LE TUE FUNZIONI ORIGINALI) ---
  const simulateApiCall = (duration = 1500) =>
    new Promise((resolve) => setTimeout(resolve, duration));
  const handleSaveMetadataFile = async () => {
    // Ottieni il valore corrente
    // Qui faresti una chiamata API per salvare permanentemente il percorso
    // Esempio: await apiClient.post('/settings', { metadata_path: metadataFilePath });
    toast.success(`Percorso "${metadataFilePath}" salvato (simulazione).`);
  };
  const handleOpenSharePoint = async (type) => {
    console.log("premuto handleopen");
  };
  const handleLoadFileFromDialog = async () => {
    try {
      const selectedPath = await openDialog({
        multiple: false,
        title: "Seleziona il file Excel",
        filters: [{ name: "Excel Files", extensions: ["xlsx", "xls"] }],
      });

      if (typeof selectedPath === "string" && selectedPath) {
        setMetadataFilePath(selectedPath);
        toast.success("Percorso file aggiornato!");
      } else {
        console.log("Selezione annullata dall'utente.");
      }
    } catch (error) {
      console.error("Errore dialog:", error);
      toast.error("Impossibile aprire la finestra di dialogo.");
    }
  };

  const handlePermissionChange = (id, field, valueOrUpdater) => {
    setHasUnsavedChanges(true);
    setPermissions((prevPermissions) =>
      prevPermissions.map((p) => {
        if (p.id === id) {
          // Se il valore è una funzione (come nel nostro caso per accessTo), la eseguiamo
          if (typeof valueOrUpdater === "function") {
            return { ...p, [field]: valueOrUpdater(p[field]) };
          }
          // Altrimenti, è un valore semplice
          return { ...p, [field]: valueOrUpdater };
        }
        return p;
      })
    );
  };

  const removePermission = async (id) => {
    // Cerchiamo l'utente da rimuovere per mostrare un messaggio di conferma più chiaro
    const userToRemove = permissions.find((p) => p.id === id);
    if (!userToRemove) return;

    if (
      window.confirm(
        `Sei sicuro di voler rimuovere l'utente "${userToRemove.user}"? L'azione è irreversibile.`
      )
    ) {
      setLoadingStates((prev) => ({ ...prev, removingPermissionId: id }));
      try {
        // Chiamata API REALE per cancellare l'utente
        await apiClient.delete(`/users/${id}`);

        // Se la chiamata ha successo, aggiorniamo lo stato del frontend
        setPermissions((prev) => prev.filter((p) => p.id !== id));
        toast.success(`Utente "${userToRemove.user}" rimosso con successo.`);
      } catch (error) {
        console.error("Errore nella rimozione dell'utente:", error);
        toast.error("Impossibile rimuovere l'utente.");
      } finally {
        setLoadingStates((prev) => ({ ...prev, removingPermissionId: null }));
      }
    }
  };
  const handleSavePermissions = async () => {
    setHasUnsavedChanges(false);
    setLoadingStates((prev) => ({ ...prev, savingPermissions: true }));
    try {
      // Usiamo Promise.all per inviare tutte le richieste di aggiornamento in parallelo
      const updatePromises = permissions.map((perm) => {
        // Prepariamo i dati da inviare per l'aggiornamento
        const userDataToUpdate = {
          role: perm.role,
          permissions: perm.accessTo, // Il nostro campo 'accessTo' corrisponde a 'permissions' nel backend
        };
        // Chiamata API REALE per aggiornare l'utente
        return apiClient.put(`/users/${perm.id}`, userDataToUpdate);
      });

      await Promise.all(updatePromises);

      toast.success("Permessi salvati con successo!"); // Sostituire con Toast
    } catch (error) {
      console.error("Errore nel salvataggio dei permessi:", error);
      toast.error(
        error.response?.data?.detail || "Impossibile salvare i permessi."
      );
    } finally {
      setLoadingStates((prev) => ({ ...prev, savingPermissions: false }));
    }
  };
  const resetIniContent = async () => {
    /* ... la tua logica ... */
  };
  const handleSaveConfigFile = async () => {
    /* ... la tua logica ... */
  };
  const handleRefreshLogs = async () => {
    // Questa funzione ora ricaricherà i dati dal backend
    setAuthLoading(true); // Mostra un feedback di caricamento
    try {
      const auditLogsResponse = await apiClient.get("/audit/logs");
      setLogEntries(auditLogsResponse.data);
      toast.success("Registro attività aggiornato!");
    } catch (error) {
      toast.error("Impossibile aggiornare il registro.");
    } finally {
      setAuthLoading(false);
    }
  };
  const handleDownloadLogs = () => {
    // Logica per scaricare i dati FILTRATI come CSV o JSON
    if (filteredLogs.length === 0) {
      // NB: 'filteredLogs' non è disponibile qui. Vedi nota sotto.
      toast.warn("Nessun dato da scaricare.");
      return;
    }
    // ... logica per creare e scaricare il file ...
    toast.info("Funzionalità di download non ancora implementata.");
  };

  // --- RENDER DEI CONTENUTI DEI TAB ---
  const renderActiveTabContent = () => {
    // Controllo di sicurezza aggiuntivo
    if (
      activeTab === "permissions" &&
      (!currentUser || currentUser.role !== "admin")
    ) {
      return (
        <div className="tab-content-padding">
          <p className="error-message">
            Accesso non autorizzato a questa sezione.
          </p>
        </div>
      );
    }

    switch (activeTab) {
      case "metadata_file":
        return (
          <MetadataFileTabContent
            // Passiamo i valori dal contesto come props
            metadataFilePath={metadataFilePath}
            setMetadataFilePath={setMetadataFilePath}
            onSave={handleSaveMetadataFile}
            isSaving={loadingStates.savingMetadataFile}
            onOpenSharePoint={handleOpenSharePoint}
            onLoadFromFile={handleLoadFileFromDialog}
          />
        );
      case "permissions":
        return (
          <PermissionsTabContent
            permissions={permissions}
            onPermissionChange={handlePermissionChange}
            onAddNew={openCreateModal}
            onRemove={removePermission}
            onSave={handleSavePermissions}
            isSaving={loadingStates.savingPermissions}
            hasUnsavedChanges={hasUnsavedChanges}
            loadingStates={loadingStates}
            searchTerm={permissionSearchTerm}
            setSearchTerm={setPermissionSearchTerm}
            roleFilter={permissionRoleFilter}
            setRoleFilter={setPermissionRoleFilter}
            accessFilter={permissionAccessFilter}
            setAccessFilter={setPermissionAccessFilter}
            availableRoles={AVAILABLE_ROLES_FOR_FILTER}
          />
        );
      case "config":
        return (
          <ConfigFileTabContent
            content={iniContent}
            setContent={setIniContent}
            onReset={resetIniContent}
            onSave={handleSaveConfigFile}
            isSaving={loadingStates.savingConfig}
            loadingStates={loadingStates}
            onOpenSharePoint={handleOpenSharePoint}
          />
        );
      case "logs":
        return (
          <LogsTabContent
            logEntries={logEntries}
            onRefreshLogs={handleRefreshLogs}
            onDownloadLogs={handleDownloadLogs}
          />
        );
      default:
        return null;
    }
  };

  // --- RENDER PRINCIPALE DEL COMPONENTE ---
  // Mostra un caricamento mentre si verificano i permessi
  if (authLoading) {
    return (
      <div
        className="settings-container"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <p>Caricamento impostazioni e permessi...</p>
      </div>
    );
  }

  const isAnyLoadingInProgress = Object.values(loadingStates).some(
    (state) => state === true || (typeof state === "string" && state !== null)
  );

  return (
    <div className="settings-container">
      <div className="settings-content-wrapper">
        <header className="settings-header-container">
          <div className="settings-header">
            <div className="settings-header-title-group">
              <div className="settings-header-icon-bg">
                <SettingsIcon className="settings-header-icon" />
              </div>
              <div>
                <h1 className="settings-header-title">Impostazioni</h1>
                <p className="settings-header-subtitle">
                  Configurazione, permessi e log
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/home")}
              className="btn btn-outline"
              disabled={isAnyLoadingInProgress}
            >
              ← Indietro
            </button>
          </div>
        </header>
        <nav className="tab-nav-container">
          <div className="tab-nav-grid">
            {TABS.map((tab) => {
              // TABS ora è l'array filtrato dinamicamente
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-button ${
                    activeTab === tab.id ? "active" : ""
                  }`}
                  disabled={isAnyLoadingInProgress && activeTab !== tab.id}
                >
                  <div className="tab-button-header">
                    <Icon className="tab-button-icon" />
                    <span className="tab-button-label">{tab.label}</span>
                  </div>
                  <p className="tab-button-description">{tab.description}</p>
                </button>
              );
            })}
          </div>
        </nav>
        <main className="tab-content-main">{renderActiveTabContent()}</main>
      </div>
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        newUser={newUser}
        setNewUser={setNewUser}
        onCreate={handleCreateUser}
        error={createError}
        isCreating={isCreating}
      />
    </div>
  );
}

export default Settings;
