import Link from "next/link";
import { BadgeCheck, Building2, Eye, Mail, MessageCircle, ShieldCheck, Users } from "lucide-react";
import type { ReactNode } from "react";
import type { AdminAccountSummary } from "@/lib/admin-accounts";

type AdminAccountsOverviewProps = {
  databaseReady: boolean;
  accounts: AdminAccountSummary[];
};

export function AdminAccountsOverview({ databaseReady, accounts }: AdminAccountsOverviewProps) {
  const totals = accounts.reduce(
    (summary, account) => ({
      accounts: summary.accounts + 1,
      googleAccounts:
        summary.googleAccounts +
        (account.provider === "google" || account.authProviders.includes("google") ? 1 : 0),
      properties: summary.properties + account.propertyCount,
      accountsWithoutProperties:
        summary.accountsWithoutProperties + (account.propertyCount === 0 ? 1 : 0),
      views: summary.views + account.views,
      whatsappClicks: summary.whatsappClicks + account.whatsappClicks,
    }),
    {
      accounts: 0,
      googleAccounts: 0,
      properties: 0,
      accountsWithoutProperties: 0,
      views: 0,
      whatsappClicks: 0,
    },
  );

  return (
    <section className="rounded-[32px] border border-black/10 bg-white p-5 shadow-[0_24px_70px_rgba(20,20,20,0.08)] sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#58745f]">
            Superadmin
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
            Cuentas de propietarios
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
            Revisa qué cuentas existen, cómo iniciaron sesión, cuántas fichas tienen asignadas y
            si sus propiedades están publicadas correctamente.
          </p>
        </div>
        <div className="rounded-full border border-black/10 bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-700">
          {databaseReady ? "MySQL conectado" : "MySQL no configurado"}
        </div>
      </div>

      {!databaseReady ? (
        <div className="mt-6 rounded-[24px] border border-dashed border-black/15 bg-neutral-50 p-5 text-sm leading-6 text-neutral-600">
          Falta configurar <code className="font-semibold text-neutral-950">DATABASE_URL</code>.
          Cuando MySQL esté activo, aquí aparecerán las cuentas reales y sus fichas asignadas.
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard icon={Users} label="Cuentas" value={totals.accounts} />
            <MetricCard icon={ShieldCheck} label="Con Google" value={totals.googleAccounts} />
            <MetricCard icon={Building2} label="Fichas asignadas" value={totals.properties} />
            <MetricCard icon={Eye} label="Vistas registradas" value={totals.views} />
            <MetricCard icon={MessageCircle} label="Clicks WhatsApp" value={totals.whatsappClicks} />
          </div>

          {totals.accountsWithoutProperties > 0 ? (
            <div className="mt-4 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
              {totals.accountsWithoutProperties} cuenta
              {totals.accountsWithoutProperties === 1 ? "" : "s"} todavía no tiene fichas
              asignadas.
            </div>
          ) : null}

          <div className="mt-6 space-y-4">
            {accounts.length > 0 ? (
              accounts.map((account) => <AccountCard key={account.id} account={account} />)
            ) : (
              <div className="rounded-[24px] border border-dashed border-black/15 bg-neutral-50 p-5 text-sm text-neutral-600">
                Todavía no hay cuentas creadas.
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[22px] border border-black/10 bg-neutral-50 p-4">
      <Icon className="h-5 w-5 text-[#58745f]" aria-hidden="true" />
      <p className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
        {formatNumber(value)}
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
        {label}
      </p>
    </div>
  );
}

function AccountCard({ account }: { account: AdminAccountSummary }) {
  return (
    <article className="rounded-[28px] border border-black/10 bg-white p-4 sm:p-5">
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.35fr]">
        <div>
          <div className="flex items-start gap-4">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-neutral-950 bg-cover bg-center text-sm font-semibold text-white"
              style={
                account.avatarUrl ? { backgroundImage: `url(${account.avatarUrl})` } : undefined
              }
              aria-hidden="true"
            >
              {account.avatarUrl ? "" : account.avatarInitials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-xl font-semibold tracking-tight text-neutral-950">
                  {account.companyName || account.displayName}
                </h3>
                <StatusBadge status={account.status} />
              </div>
              {account.companyName ? (
                <p className="mt-1 text-sm text-neutral-500">{account.displayName}</p>
              ) : null}
              <div className="mt-3 space-y-2 text-sm text-neutral-600">
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                  <span className="break-all">{account.email}</span>
                </p>
                <p className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                  <span>{account.phone || "Sin teléfono"}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <SoftBadge>{account.roleLabel}</SoftBadge>
            <SoftBadge>Propietario</SoftBadge>
            {account.authProviders.length > 0 ? (
              account.authProviders.map((provider) => (
                <SoftBadge key={provider}>{provider === "google" ? "Google" : "Email"}</SoftBadge>
              ))
            ) : (
              <SoftBadge>{account.provider}</SoftBadge>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <AccountStat label="Fichas" value={account.propertyCount} />
            <AccountStat label="Premium" value={account.premiumCount} />
            <AccountStat label="Vistas" value={account.views} />
            <AccountStat label="WhatsApp" value={account.whatsappClicks} />
          </div>

          <p className="mt-4 text-xs font-medium text-neutral-400">
            Creada: {formatDate(account.createdAt)} · Actualizada: {formatDate(account.updatedAt)}
          </p>
        </div>

        <div className="rounded-[24px] bg-neutral-50 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-neutral-950">Fichas vinculadas</p>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-600">
              {account.activePropertyCount} activa{account.activePropertyCount === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-3 space-y-3">
            {account.properties.length > 0 ? (
              account.properties.map((property) => (
                <div
                  key={property.id}
                  className="rounded-[20px] border border-black/10 bg-white p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <SoftBadge>{planLabel(property.planSlug)}</SoftBadge>
                        <SoftBadge>{property.published ? "Publicada" : "Oculta"}</SoftBadge>
                        {property.featured ? <SoftBadge>Destacada</SoftBadge> : null}
                      </div>
                      <h4 className="mt-2 line-clamp-2 text-base font-semibold text-neutral-950">
                        {property.title}
                      </h4>
                      <p className="mt-1 text-sm text-neutral-500">
                        {property.operation} · {property.type} · {property.zone}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-neutral-900">
                        {formatMoney(property.price, property.currency)}
                      </p>
                    </div>
                    <Link
                      href={`/propiedades/${property.slug}`}
                      className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
                    >
                      Ver ficha
                    </Link>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <MiniStat label="Vistas" value={property.views} />
                    <MiniStat label="Ficha" value={property.propertyClicks} />
                    <MiniStat label="Mapa" value={property.mapViews} />
                    <MiniStat label="WhatsApp" value={property.whatsappClicks} />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-dashed border-black/15 bg-white p-4 text-sm text-neutral-600">
                Esta cuenta existe, pero todavía no tiene propiedades vinculadas.
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function AccountStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[18px] bg-neutral-50 p-3">
      <p className="text-lg font-semibold text-neutral-950">{formatNumber(value)}</p>
      <p className="text-xs font-medium text-neutral-500">{label}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-neutral-50 px-3 py-2">
      <p className="font-semibold text-neutral-950">{formatNumber(value)}</p>
      <p className="text-neutral-500">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status === "active";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        active ? "bg-[#eef7ef] text-[#285340]" : "bg-neutral-100 text-neutral-600"
      }`}
    >
      {active ? <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      {active ? "Activa" : status}
    </span>
  );
}

function SoftBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-7 items-center rounded-full border border-black/10 bg-white px-3 text-xs font-semibold text-neutral-700">
      {children}
    </span>
  );
}

function planLabel(planSlug: string) {
  if (planSlug === "premium") {
    return "Premium";
  }

  if (planSlug === "pro") {
    return "Pro";
  }

  return "Básico";
}

function formatMoney(price: number, currency: string) {
  const amount = new Intl.NumberFormat("es-BO", { maximumFractionDigits: 0 }).format(price);
  return currency === "BOB" ? `Bs. ${amount}` : `$us ${amount}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-BO").format(value);
}

function formatDate(value: Date | string | null) {
  if (!value) {
    return "Sin fecha";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
