import type {
  AuctionOverlay,
  AuctionParticipant,
  AuctionVehicleTerms,
  MaximumBidTransitionResult,
  MaximumBidValidationResult,
} from "./types";

export const PROXY_BID_INCREMENT = 500;

function getParticipantMaximum(
  state: AuctionOverlay,
  participant: AuctionParticipant,
): number | null {
  return participant === "buyer" ? state.buyerMax : state.competitorMax;
}

function addSafeWholeDollars(value: number, increment: number): number | null {
  return value <= Number.MAX_SAFE_INTEGER - increment
    ? value + increment
    : null;
}

export function isValidMaximumAmount(amount: number): boolean {
  return Number.isSafeInteger(amount) && amount > 0;
}

export function getMinimumAcceptedMaximum(
  vehicle: AuctionVehicleTerms,
  state: AuctionOverlay,
  participant: AuctionParticipant,
): number | null {
  if (state.finalization !== null) {
    return null;
  }

  const participantMaximum = getParticipantMaximum(state, participant);

  if (state.leader === participant) {
    return participantMaximum === null
      ? null
      : addSafeWholeDollars(participantMaximum, 1);
  }

  const publicMinimum =
    state.publicPrice === null
      ? vehicle.startingBid
      : addSafeWholeDollars(state.publicPrice, PROXY_BID_INCREMENT);
  const participantMinimum =
    participantMaximum === null
      ? 1
      : addSafeWholeDollars(participantMaximum, 1);

  if (publicMinimum === null || participantMinimum === null) {
    return null;
  }

  return Math.max(publicMinimum, participantMinimum);
}

export function validateMaximumBid(
  vehicle: AuctionVehicleTerms,
  state: AuctionOverlay,
  participant: AuctionParticipant,
  amount: number,
): MaximumBidValidationResult {
  if (state.finalization !== null) {
    return {
      ok: false,
      code: "auction-closed",
      minimumAccepted: null,
    };
  }

  const minimumAccepted = getMinimumAcceptedMaximum(
    vehicle,
    state,
    participant,
  );

  if (!isValidMaximumAmount(amount)) {
    return {
      ok: false,
      code: "invalid-amount",
      minimumAccepted,
    };
  }

  if (minimumAccepted === null) {
    return {
      ok: false,
      code: "maximum-limit-reached",
      minimumAccepted: null,
    };
  }

  const previousMaximum = getParticipantMaximum(state, participant);

  if (previousMaximum !== null && amount <= previousMaximum) {
    return {
      ok: false,
      code: "maximum-not-raised",
      minimumAccepted,
    };
  }

  if (amount < minimumAccepted) {
    return {
      ok: false,
      code: "below-minimum",
      minimumAccepted,
    };
  }

  return {
    ok: true,
    minimumAccepted,
  };
}

function resolveLeader(
  buyerMaximum: number | null,
  competitorMaximum: number | null,
  incumbent: AuctionOverlay["leader"],
  submittingParticipant: AuctionParticipant,
): AuctionParticipant {
  if (buyerMaximum === null) {
    return "competitor";
  }

  if (competitorMaximum === null) {
    return "buyer";
  }

  if (buyerMaximum > competitorMaximum) {
    return "buyer";
  }

  if (competitorMaximum > buyerMaximum) {
    return "competitor";
  }

  return incumbent ?? submittingParticipant;
}

function calculateCompetitivePrice(
  vehicle: AuctionVehicleTerms,
  previousPublicPrice: number | null,
  buyerMaximum: number | null,
  competitorMaximum: number | null,
  leader: AuctionParticipant,
): number {
  const leadingMaximum =
    leader === "buyer" ? buyerMaximum : competitorMaximum;

  if (leadingMaximum === null) {
    throw new Error("A resolved auction leader must have a maximum.");
  }

  let competitivePrice: number;

  if (buyerMaximum === null || competitorMaximum === null) {
    competitivePrice = vehicle.startingBid;
  } else {
    const lowerMaximum = Math.min(buyerMaximum, competitorMaximum);
    const incrementedLowerMaximum = addSafeWholeDollars(
      lowerMaximum,
      PROXY_BID_INCREMENT,
    );

    competitivePrice = Math.min(
      leadingMaximum,
      incrementedLowerMaximum ?? leadingMaximum,
    );
  }

  competitivePrice = Math.max(
    previousPublicPrice ?? competitivePrice,
    competitivePrice,
  );
  competitivePrice = Math.min(competitivePrice, leadingMaximum);

  if (
    vehicle.reservePrice !== null &&
    leadingMaximum >= vehicle.reservePrice
  ) {
    competitivePrice = Math.min(
      leadingMaximum,
      Math.max(competitivePrice, vehicle.reservePrice),
    );
  }

  return competitivePrice;
}

export function submitMaximumBid(
  vehicle: AuctionVehicleTerms,
  state: AuctionOverlay,
  participant: AuctionParticipant,
  amount: number,
): MaximumBidTransitionResult {
  const validation = validateMaximumBid(
    vehicle,
    state,
    participant,
    amount,
  );

  if (!validation.ok) {
    return {
      ...validation,
      state,
    };
  }

  const buyerMaximum = participant === "buyer" ? amount : state.buyerMax;
  const competitorMaximum =
    participant === "competitor" ? amount : state.competitorMax;
  const leader = resolveLeader(
    buyerMaximum,
    competitorMaximum,
    state.leader,
    participant,
  );
  const bidCountIncremented = state.leader !== participant;

  return {
    ok: true,
    minimumAccepted: validation.minimumAccepted,
    bidCountIncremented,
    state: {
      publicPrice: calculateCompetitivePrice(
        vehicle,
        state.publicPrice,
        buyerMaximum,
        competitorMaximum,
        leader,
      ),
      bidCount: state.bidCount + (bidCountIncremented ? 1 : 0),
      buyerMax: buyerMaximum,
      competitorMax: competitorMaximum,
      leader,
      finalization: null,
    },
  };
}
