/**
 * GiftEvent — Data structure for gift events.
 */
export function createGiftEvent({ giftId, giftName, quantity, senderId, senderName }) {
  return {
    id: `gift_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    giftId,
    giftName,
    quantity: quantity || 1,
    senderId: senderId || 'test-user',
    senderName: senderName || 'TestUser',
    timestamp: Date.now(),
  };
}
