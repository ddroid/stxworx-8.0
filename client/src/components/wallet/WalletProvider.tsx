import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as Shared from "../../shared";
import { getCurrentUser, getUserProfile, logoutUser, verifyWallet } from "../../lib/api";
import { authenticate, userSession, getUserData, getUserAddress, requestSignMessage } from "../../lib/stacks";
import type { UserRole } from "../../types/user";

type WalletProviderProps = {
  value: Omit<Shared.WalletContextType, "connect" | "disconnect" | "completeRoleSelection" | "isSignedIn" | "userSession" | "userData" | "needsRoleSelection">;
  children: React.ReactNode;
};

const PENDING_ROLE_KEY = "stxworx_pending_role";
const USER_ROLE_KEY = "stxworx_user_role";

export function WalletProvider({ value, children }: WalletProviderProps) {
  const { setWalletAddress, setUserRole } = value;
  const [userData, setUserData] = useState<any>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);

  const establishBackendSession = useCallback(
    async (role: UserRole) => {
      const address = getUserAddress();
      if (!address) {
        throw new Error("No wallet connected");
      }

      const message = `Sign in to STXWORX as ${role} on ${window.location.host} at ${new Date().toISOString()}`;
      const signedMessage = await requestSignMessage(message);

      if (!signedMessage) {
        throw new Error("Wallet message signing was cancelled");
      }

      const session = await verifyWallet({
        stxAddress: address,
        publicKey: signedMessage.publicKey,
        signature: signedMessage.signature,
        message,
        role,
      });

      setUserRole(session.user.role);
      window.localStorage.setItem(USER_ROLE_KEY, session.user.role);
      setIsSignedIn(true);
      setNeedsRoleSelection(false);
      window.localStorage.removeItem(PENDING_ROLE_KEY);
    },
    [setUserRole],
  );

  const authenticateBackendSession = useCallback(
    async (roleOverride?: UserRole | null) => {
      const address = getUserAddress();
      if (!address) {
        setIsSignedIn(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        setUserRole(currentUser.user.role);
        window.localStorage.setItem(USER_ROLE_KEY, currentUser.user.role);
        setIsSignedIn(true);
        setNeedsRoleSelection(false);
        window.localStorage.removeItem(PENDING_ROLE_KEY);
        return;
      } catch {}

      let existingRole: UserRole | null = null;

      try {
        const profile = await getUserProfile(address);
        existingRole = profile.role;
      } catch (error) {
        console.error("Error loading wallet profile:", error);
      }

      const pendingRole = roleOverride || (window.localStorage.getItem(PENDING_ROLE_KEY) as UserRole | null);
      const resolvedRole = existingRole || pendingRole;

      if (!resolvedRole) {
        setIsSignedIn(false);
        setNeedsRoleSelection(true);
        return;
      }

      await establishBackendSession(resolvedRole);
    },
    [establishBackendSession, setUserRole],
  );

  useEffect(() => {
    const hydrateSession = async () => {
      if (userSession.isSignInPending()) {
        try {
          const data = await userSession.handlePendingSignIn();
          setUserData(data);
          const address =
            data.profile?.stxAddress?.testnet || data.profile?.stxAddress?.mainnet || null;
          setWalletAddress(address);
          await authenticateBackendSession();
        } catch (error) {
          console.error("Error handling pending sign in:", error);
          setIsSignedIn(false);
        }
        return;
      }

      if (userSession.isUserSignedIn()) {
        try {
          const data = getUserData();
          setUserData(data);
          setWalletAddress(getUserAddress());
          await authenticateBackendSession();
        } catch (error) {
          console.error("Error loading user session:", error);
          setIsSignedIn(false);
        }
      } else {
        setIsSignedIn(false);
      }
    };

    hydrateSession();
  }, [authenticateBackendSession, setWalletAddress]);

  const connect = useCallback((role?: UserRole) => {
    if (role) {
      window.localStorage.setItem(PENDING_ROLE_KEY, role);
    }

    authenticate(() => {
      if (userSession.isUserSignedIn()) {
        const data = getUserData();
        setUserData(data);
        setWalletAddress(getUserAddress());
        setIsSignedIn(false);
        authenticateBackendSession(role).catch((error) => {
          console.error("Error creating backend session:", error);
        });
      }
    });
  }, [authenticateBackendSession, setWalletAddress]);

  const completeRoleSelection = useCallback(
    async (role: UserRole) => {
      await establishBackendSession(role);
    },
    [establishBackendSession],
  );

  const disconnect = useCallback(() => {
    logoutUser().catch(() => undefined);
    userSession.signUserOut(window.location.origin);
    setIsSignedIn(false);
    setUserData(null);
    setWalletAddress(null);
    setUserRole(null);
    setNeedsRoleSelection(false);
    // Clear persisted role on disconnect
    window.localStorage.removeItem(PENDING_ROLE_KEY);
    window.localStorage.removeItem(USER_ROLE_KEY);
  }, [setUserRole, setWalletAddress]);

  const providerValue = useMemo<Shared.WalletContextType>(
    () => ({
      ...value,
      connect,
      disconnect,
      completeRoleSelection,
      isSignedIn,
      userSession,
      userData,
      needsRoleSelection,
    }),
    [value, connect, disconnect, completeRoleSelection, isSignedIn, userData, needsRoleSelection],
  );

  return (
    <Shared.WalletContext.Provider value={providerValue}>{children}</Shared.WalletContext.Provider>
  );
}
