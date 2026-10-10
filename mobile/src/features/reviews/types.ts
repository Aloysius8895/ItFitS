// purchaseId links a review to a Purchase; older saved reviews used productId for that.
export type Review = { purchaseId?: string; productId: string; purchasedSize: string; rating: number; zones: string[]; submittedAt: string; predictionId?: string; predictedRating?: number; synced?: boolean };

// A size the user bought. predictionId links it to the backend prediction so the review can retrain the model.
export type Purchase = { id: string; productId: string; name: string; size: string; purchasedAt: string; predictedRating: number; predictionId?: string; demo?: boolean };
