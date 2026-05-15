import { apiClient } from '../../lib/api-client';

export type DeliveryAddressOption = {
  id: string;
  name: string;
  address: string;
};

type TenantWithSettings = {
  settings?: unknown;
};

function parseSettings(settings: unknown): Record<string, unknown> {
  if (!settings) return {};
  if (typeof settings === 'string') {
    try {
      const parsed = JSON.parse(settings);
      return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return typeof settings === 'object' && settings !== null ? settings as Record<string, unknown> : {};
}

function makeAddressId(): string {
  return `addr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeDeliveryAddresses(value: unknown): DeliveryAddressOption[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry): DeliveryAddressOption | null => {
      if (typeof entry === 'string') {
        const address = entry.trim();
        return address ? { id: makeAddressId(), name: address.split('\n')[0] || 'Delivery Address', address } : null;
      }
      if (typeof entry !== 'object' || entry === null) return null;
      const record = entry as Record<string, unknown>;
      const address = String(record.address ?? '').trim();
      if (!address) return null;
      const name = String(record.name ?? '').trim() || address.split('\n')[0] || 'Delivery Address';
      const id = String(record.id ?? '').trim() || makeAddressId();
      return { id, name, address };
    })
    .filter((entry): entry is DeliveryAddressOption => Boolean(entry));
}

export async function loadDeliveryAddresses(): Promise<DeliveryAddressOption[]> {
  const tenant = await apiClient.get<TenantWithSettings>('/tenant/current');
  const settings = parseSettings(tenant?.settings);
  return normalizeDeliveryAddresses(settings.deliveryAddresses);
}

export async function saveDeliveryAddress(name: string, address: string): Promise<DeliveryAddressOption[]> {
  const tenant = await apiClient.get<TenantWithSettings>('/tenant/current');
  const settings = parseSettings(tenant?.settings);
  const existing = normalizeDeliveryAddresses(settings.deliveryAddresses);
  const normalizedAddress = address.trim();
  const normalizedName = name.trim() || normalizedAddress.split('\n')[0] || 'Delivery Address';

  if (!normalizedAddress) return existing;

  const withoutDuplicate = existing.filter(
    (entry) => entry.address.trim().toLowerCase() !== normalizedAddress.toLowerCase(),
  );
  const next = [...withoutDuplicate, { id: makeAddressId(), name: normalizedName, address: normalizedAddress }];

  await apiClient.put('/tenant/current', {
    settings: {
      ...settings,
      deliveryAddresses: next,
    },
  });

  return next;
}
