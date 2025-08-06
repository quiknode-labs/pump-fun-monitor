# Monitor Solana Programs with Yellowstone Geyser gRPC (TypeScript)

https://www.quicknode.com/guides/solana-development/tooling/geyser/yellowstone

fromSlot is live now and enables historical replay for our Yellowstone Geyser gRPC streams on Solana Mainnet.
This feature allows clients to use the fromSlot parameter to replay data from up to 3000 recent slots, providing improved flexibility for clients that may experience missed messages or need backfill during recovery.

## Using the fromSlot Parameter

The `fromSlot` parameter allows you to start receiving transaction data from a specific slot number, enabling historical replay of up to 3000 recent slots. This is particularly useful for:

- **Recovery scenarios**: When your application restarts and you need to catch up on missed transactions
- **Backfill operations**: When you need to process historical data within the 3000 slot window
- **Testing**: When you want to replay recent activity for analysis

### Basic Usage

```typescript
import {
  SubscribeRequest,
  CommitmentLevel,
} from "@triton-one/yellowstone-grpc";

// Get current slot
const currentSlot = await yellowstoneClient.getSlot();

// Start from 1000 slots ago
const fromSlot = currentSlot - 1000;

const request: SubscribeRequest = {
  accounts: {},
  slots: {
    slots: {
      fromSlot: fromSlot,
    },
  },
  transactions: {
    pumpFun: {
      accountInclude: programIds,
      accountExclude: [],
      accountRequired: requiredAccounts,
    },
  },
  // ... other configuration
  commitment: CommitmentLevel.CONFIRMED,
};
```

### Recovery Scenario Example

```typescript
async function watchWithRecovery() {
  const yellowstoneClient = getYellowstoneClient("mainnet");

  // In a real application, you might store the last processed slot
  const lastProcessedSlot = getLastProcessedSlotFromStorage(); // Your storage logic
  const currentSlot = await yellowstoneClient.getSlot();

  // Only replay if the gap is within the 3000 slot limit
  const slotGap = currentSlot - lastProcessedSlot;
  if (slotGap > 3000) {
    console.log("Slot gap too large, starting from current slot");
    // Use regular subscription without fromSlot
  } else {
    console.log(`Replaying from slot ${lastProcessedSlot} to catch up`);
    // Use fromSlot to replay missed transactions
    const request: SubscribeRequest = {
      // ... configuration with fromSlot
      slots: {
        slots: {
          fromSlot: lastProcessedSlot,
        },
      },
    };
  }
}
```

### Important Notes

1. **Slot Limit**: The `fromSlot` parameter can only replay up to 3000 recent slots
2. **Performance**: Replaying many slots will result in a burst of historical data before catching up to real-time
3. **Use Cases**: Best suited for recovery scenarios rather than continuous historical analysis
4. **Network Impact**: Replaying slots will consume more bandwidth initially

### Running the Examples

```bash
# Run the basic example
npx tsx watch-pump-token-mints.ts

# Run the fromSlot example
npx tsx example-with-fromslot.ts
```

## Files

- `watch-pump-token-mints.ts` - Basic example without fromSlot
- `example-with-fromslot.ts` - Example demonstrating fromSlot usage
- `helpers.ts` - Utility functions for YellowStone client
- `interfaces.ts` - TypeScript interfaces
