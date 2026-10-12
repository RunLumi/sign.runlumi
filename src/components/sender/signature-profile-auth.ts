export function signatureProfileAuthHeaders(
	senderSessionToken: string | undefined,
	historyAccess = false,
): Record<string, string> {
	if (historyAccess) {
		return { "Content-Type": "application/json", "x-history-session-access": "true" };
	}
	if (senderSessionToken) {
		return {
			"Content-Type": "application/json",
			"x-sender-session-token": senderSessionToken,
		};
	}
	return {
		"Content-Type": "application/json",
		"x-internal-user-id": "ui-user",
	};
}
