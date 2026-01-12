import fc from 'fast-check';
import { 
  hasPermission, 
  canAccessParty, 
  canPerformSettlement,
  getAccessibleParties,
  validateSettlementPermissions,
  filterLedgerEntriesByPermissions,
  filterSettlementsByPermissions,
  LEDGER_PERMISSIONS 
} from '../permissionsService';
import { USER_ROLES, PARTY_TYPES, LEDGER_ENTRY_TYPES, LEDGER_ENTRY_STATUSES } from '../../models';

/**
 * Feature: revenue-auto-split-ledger, Property 23: Access Control Enforcement
 * **Validates: Requirements 10.1, 10.2, 10.5**
 */

// Generators for test data
const userRoleGen = fc.constantFrom(...Object.values(USER_ROLES));
const partyTypeGen = fc.constantFrom(...Object.values(PARTY_TYPES));
const permissionGen = fc.constantFrom(...Object.values(LEDGER_PERMISSIONS));

const userGen = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  role: userRoleGen,
  party: fc.option(partyTypeGen, { nil: null }),
  permissions: fc.array(permissionGen, { maxLength: 5 })
});

const ledgerEntryGen = fc.record({
  id: fc.uuid(),
  paymentId: fc.uuid(),
  projectId: fc.uuid(),
  party: partyTypeGen,
  type: fc.constantFrom(...Object.values(LEDGER_ENTRY_TYPES)),
  amount: fc.float({ min: Math.fround(0.01), max: Math.fround(10000) }),
  currency: fc.constantFrom('USD', 'EUR', 'GBP'),
  status: fc.constantFrom(...Object.values(LEDGER_ENTRY_STATUSES)),
  date: fc.date()
});

const settlementGen = fc.record({
  id: fc.uuid(),
  party: partyTypeGen,
  ledgerEntryIds: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
  totalAmount: fc.float({ min: Math.fround(0.01), max: Math.fround(10000) }),
  currency: fc.constantFrom('USD', 'EUR', 'GBP'),
  settlementDate: fc.date()
});

describe('Access Control Enforcement Property Tests', () => {
  describe('Property 23.1: Role-based permission enforcement', () => {
    test('Admin users should have access to all ledger permissions', () => {
      fc.assert(fc.property(
        permissionGen,
        (permission) => {
          const adminUser = {
            id: 'admin-1',
            role: USER_ROLES.ADMIN,
            permissions: []
          };
          
          const hasAccess = hasPermission(adminUser, permission);
          
          // Admins should have access to all permissions through their role
          expect(hasAccess).toBe(true);
        }
      ), { numRuns: 100 });
    });

    test('Member users should only have read-only permissions', () => {
      fc.assert(fc.property(
        permissionGen,
        (permission) => {
          const memberUser = {
            id: 'member-1',
            role: USER_ROLES.MEMBER,
            permissions: []
          };
          
          const hasAccess = hasPermission(memberUser, permission);
          
          // Members should only have specific read-only permissions
          const allowedMemberPermissions = [
            LEDGER_PERMISSIONS.VIEW_LEDGER_ENTRIES,
            LEDGER_PERMISSIONS.VIEW_SETTLEMENTS,
            LEDGER_PERMISSIONS.VIEW_PARTY_BALANCES
          ];
          
          if (allowedMemberPermissions.includes(permission)) {
            expect(hasAccess).toBe(true);
          } else {
            expect(hasAccess).toBe(false);
          }
        }
      ), { numRuns: 100 });
    });

    test('Users without permissions should be denied access', () => {
      fc.assert(fc.property(
        userRoleGen,
        permissionGen,
        (role, permission) => {
          const userWithoutPermissions = {
            id: 'user-1',
            role: role === USER_ROLES.ADMIN ? USER_ROLES.MEMBER : role, // Exclude admin to test denial
            permissions: [] // No explicit permissions
          };
          
          const hasAccess = hasPermission(userWithoutPermissions, permission);
          
          // Only members with specific permissions or managers/admins should have access
          if (userWithoutPermissions.role === USER_ROLES.MEMBER) {
            const allowedMemberPermissions = [
              LEDGER_PERMISSIONS.VIEW_LEDGER_ENTRIES,
              LEDGER_PERMISSIONS.VIEW_SETTLEMENTS,
              LEDGER_PERMISSIONS.VIEW_PARTY_BALANCES
            ];
            expect(hasAccess).toBe(allowedMemberPermissions.includes(permission));
          }
        }
      ), { numRuns: 100 });
    });
  });

  describe('Property 23.2: Party-based access restrictions', () => {
    test('Users can only access parties they are authorized for', () => {
      fc.assert(fc.property(
        userGen,
        partyTypeGen,
        (user, party) => {
          const canAccess = canAccessParty(user, party);
          const accessibleParties = getAccessibleParties(user);
          
          // User should only be able to access parties in their accessible list
          expect(canAccess).toBe(accessibleParties.includes(party));
        }
      ), { numRuns: 100 });
    });

    test('Admin users can access all parties', () => {
      fc.assert(fc.property(
        partyTypeGen,
        (party) => {
          const adminUser = {
            id: 'admin-1',
            role: USER_ROLES.ADMIN,
            permissions: []
          };
          
          const canAccess = canAccessParty(adminUser, party);
          
          // Admins should be able to access all parties
          expect(canAccess).toBe(true);
        }
      ), { numRuns: 100 });
    });

    test('Member users can only access their own party data', () => {
      fc.assert(fc.property(
        partyTypeGen,
        partyTypeGen,
        (userParty, requestedParty) => {
          const memberUser = {
            id: 'member-1',
            role: USER_ROLES.MEMBER,
            party: userParty,
            permissions: []
          };
          
          const canAccess = canAccessParty(memberUser, requestedParty);
          
          // Members should only access their own party or default to team
          const expectedParty = userParty || PARTY_TYPES.TEAM;
          expect(canAccess).toBe(requestedParty === expectedParty);
        }
      ), { numRuns: 100 });
    });
  });

  describe('Property 23.3: Settlement operation permissions', () => {
    test('Settlement permissions are properly validated', () => {
      fc.assert(fc.property(
        userGen,
        partyTypeGen,
        (user, party) => {
          const canSettle = canPerformSettlement(user, party);
          
          // User must have settlement permission AND party access
          const hasSettlementPermission = hasPermission(user, LEDGER_PERMISSIONS.CREATE_SETTLEMENTS);
          const hasPartyAccess = canAccessParty(user, party);
          
          expect(canSettle).toBe(hasSettlementPermission && hasPartyAccess);
        }
      ), { numRuns: 100 });
    });

    test('Settlement validation throws error for unauthorized users', () => {
      fc.assert(fc.property(
        fc.array(ledgerEntryGen, { minLength: 1, maxLength: 5 }),
        (ledgerEntries) => {
          const unauthorizedUser = {
            id: 'unauthorized-1',
            role: USER_ROLES.MEMBER,
            permissions: [] // No settlement permissions
          };
          
          // Should throw error for unauthorized settlement attempt
          expect(() => {
            validateSettlementPermissions(unauthorizedUser, ledgerEntries);
          }).toThrow('Insufficient permissions to create settlements');
        }
      ), { numRuns: 50 });
    });

    test('Settlement validation passes for authorized users with correct party access', () => {
      fc.assert(fc.property(
        partyTypeGen,
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 3 }),
        (party, entryCounts) => {
          const authorizedUser = {
            id: 'authorized-1',
            role: USER_ROLES.ADMIN, // Admin has all permissions
            permissions: []
          };
          
          // Create ledger entries all for the same party
          const ledgerEntries = entryCounts.map((_, index) => ({
            id: `entry-${index}`,
            party: party,
            amount: 100,
            type: LEDGER_ENTRY_TYPES.CREDIT
          }));
          
          // Should not throw for authorized user with correct party access
          expect(() => {
            validateSettlementPermissions(authorizedUser, ledgerEntries);
          }).not.toThrow();
        }
      ), { numRuns: 50 });
    });
  });

  describe('Property 23.4: Data filtering based on permissions', () => {
    test('Ledger entries are filtered according to user permissions', () => {
      fc.assert(fc.property(
        userGen,
        fc.array(ledgerEntryGen, { maxLength: 10 }),
        (user, allEntries) => {
          const filteredEntries = filterLedgerEntriesByPermissions(allEntries, user);
          
          // All filtered entries should be accessible to the user
          filteredEntries.forEach(entry => {
            expect(canAccessParty(user, entry.party)).toBe(true);
          });
          
          // If user has VIEW_ALL_LEDGER_ENTRIES permission, should see all entries
          if (hasPermission(user, LEDGER_PERMISSIONS.VIEW_ALL_LEDGER_ENTRIES)) {
            expect(filteredEntries).toEqual(allEntries);
          } else {
            // Otherwise, should only see entries for accessible parties
            const accessibleParties = getAccessibleParties(user);
            const expectedEntries = allEntries.filter(entry => 
              accessibleParties.includes(entry.party)
            );
            expect(filteredEntries).toEqual(expectedEntries);
          }
        }
      ), { numRuns: 50 });
    });

    test('Settlements are filtered according to user permissions', () => {
      fc.assert(fc.property(
        userGen,
        fc.array(settlementGen, { maxLength: 10 }),
        (user, allSettlements) => {
          const filteredSettlements = filterSettlementsByPermissions(allSettlements, user);
          
          // All filtered settlements should be accessible to the user
          filteredSettlements.forEach(settlement => {
            expect(canAccessParty(user, settlement.party)).toBe(true);
          });
          
          // If user has VIEW_ALL_SETTLEMENTS permission, should see all settlements
          if (hasPermission(user, LEDGER_PERMISSIONS.VIEW_ALL_SETTLEMENTS)) {
            expect(filteredSettlements).toEqual(allSettlements);
          } else {
            // Otherwise, should only see settlements for accessible parties
            const accessibleParties = getAccessibleParties(user);
            const expectedSettlements = allSettlements.filter(settlement => 
              accessibleParties.includes(settlement.party)
            );
            expect(filteredSettlements).toEqual(expectedSettlements);
          }
        }
      ), { numRuns: 50 });
    });
  });

  describe('Property 23.5: Permission consistency across operations', () => {
    test('Permission checks are consistent across different access methods', () => {
      fc.assert(fc.property(
        userGen,
        permissionGen,
        partyTypeGen,
        (user, permission, party) => {
          const hasDirectPermission = hasPermission(user, permission);
          const hasPartyAccess = canAccessParty(user, party);
          
          // If user has a party-specific permission, they should have party access
          const partySpecificPermissions = [
            LEDGER_PERMISSIONS.VIEW_LEDGER_ENTRIES,
            LEDGER_PERMISSIONS.VIEW_SETTLEMENTS,
            LEDGER_PERMISSIONS.VIEW_PARTY_BALANCES
          ];
          
          if (partySpecificPermissions.includes(permission) && hasDirectPermission) {
            const accessibleParties = getAccessibleParties(user);
            // User should have access to at least one party if they have party-specific permissions
            expect(accessibleParties.length).toBeGreaterThan(0);
          }
        }
      ), { numRuns: 100 });
    });

    test('Hierarchical permissions work correctly', () => {
      fc.assert(fc.property(
        partyTypeGen,
        (party) => {
          // Test permission hierarchy: Admin > Manager > Member
          const adminUser = { id: 'admin', role: USER_ROLES.ADMIN, permissions: [] };
          const managerUser = { id: 'manager', role: USER_ROLES.MANAGER, permissions: [] };
          const memberUser = { id: 'member', role: USER_ROLES.MEMBER, permissions: [] };
          
          const adminAccess = canAccessParty(adminUser, party);
          const managerAccess = canAccessParty(managerUser, party);
          const memberAccess = canAccessParty(memberUser, party);
          
          // Admin should have access to all parties
          expect(adminAccess).toBe(true);
          
          // Manager should have access to admin and team parties
          if (party === PARTY_TYPES.ADMIN || party === PARTY_TYPES.TEAM) {
            expect(managerAccess).toBe(true);
          } else {
            expect(managerAccess).toBe(false);
          }
          
          // Member should only have access to team party (default)
          expect(memberAccess).toBe(party === PARTY_TYPES.TEAM);
        }
      ), { numRuns: 100 });
    });
  });

  describe('Property 23.6: Security boundary enforcement', () => {
    test('No user can bypass permission checks', () => {
      fc.assert(fc.property(
        userGen,
        permissionGen,
        (user, permission) => {
          // Modify user to remove the permission
          const userWithoutPermission = {
            ...user,
            role: USER_ROLES.MEMBER, // Force to member role
            permissions: user.permissions.filter(p => p !== permission)
          };
          
          const hasAccess = hasPermission(userWithoutPermission, permission);
          
          // Should only have access if it's a default member permission
          const defaultMemberPermissions = [
            LEDGER_PERMISSIONS.VIEW_LEDGER_ENTRIES,
            LEDGER_PERMISSIONS.VIEW_SETTLEMENTS,
            LEDGER_PERMISSIONS.VIEW_PARTY_BALANCES
          ];
          
          expect(hasAccess).toBe(defaultMemberPermissions.includes(permission));
        }
      ), { numRuns: 100 });
    });

    test('Permission validation is fail-safe', () => {
      fc.assert(fc.property(
        permissionGen,
        (permission) => {
          // Test with null/undefined users
          expect(hasPermission(null, permission)).toBe(false);
          expect(hasPermission(undefined, permission)).toBe(false);
          
          // Test with invalid user objects
          expect(hasPermission({}, permission)).toBe(false);
          expect(hasPermission({ id: 'test' }, permission)).toBe(false);
          
          // Test with null/undefined permissions
          const validUser = { id: 'test', role: USER_ROLES.ADMIN, permissions: [] };
          expect(hasPermission(validUser, null)).toBe(false);
          expect(hasPermission(validUser, undefined)).toBe(false);
        }
      ), { numRuns: 50 });
    });
  });
});