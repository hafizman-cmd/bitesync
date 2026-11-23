export const errors = {
  jsonRequired: { en: "Send an application/json request.", ms: "Hantar permintaan dalam format application/json." },
  bodyTooLarge: { en: "Request is too large.", ms: "Permintaan terlalu besar." },
  invalidRequest: { en: "The request is invalid.", ms: "Permintaan tidak sah." },
  invalidName: { en: "Enter a name with 1 to 32 characters.", ms: "Masukkan nama antara 1 hingga 32 aksara." },
  invalidLink: { en: "This room link is invalid.", ms: "Pautan bilik ini tidak sah." },
  invalidQuery: { en: "Enter an area with 2 to 100 characters.", ms: "Masukkan nama kawasan antara 2 hingga 100 aksara." },
  missingArea: { en: "Enter an area first.", ms: "Masukkan nama kawasan dahulu." },
  invalidArea: { en: "Enter an area with 2 to 100 characters.", ms: "Masukkan nama kawasan antara 2 hingga 100 aksara." },
  invalidSearchDistance: { en: "Choose a search distance of 3, 5, 10, or 20 km.", ms: "Pilih jarak carian 3, 5, 10 atau 20 km." },
  invalidRestaurantFilters: { en: "Choose a valid cuisine preference.", ms: "Pilih jenis masakan yang sah." },
  invalidHostPlaces: { en: "Add up to 10 restaurant names, with 1 to 100 characters each.", ms: "Tambah sehingga 10 nama restoran, antara 1 hingga 100 aksara setiap satu." },
  duplicateHostPlace: { en: "Add each restaurant only once.", ms: "Tambah setiap restoran sekali sahaja." },
  tooFewHostPlaces: { en: "Add at least two restaurants to create a room with only host suggestions.", ms: "Tambah sekurang-kurangnya dua restoran untuk membuat bilik dengan cadangan hos sahaja." },
  tooFewPlaces: { en: "Web search found too few restaurants. Try a nearby city or add your own suggestions.", ms: "Carian web tidak menemui restoran yang mencukupi. Cuba bandar berdekatan atau tambah cadangan sendiri." },
  tooFewFilteredPlaces: { en: "Fewer than two restaurants match these filters. Try a longer search distance or a different area.", ms: "Kurang daripada dua restoran sepadan dengan penapis ini. Cuba jarak carian yang lebih jauh atau kawasan lain." },
  invalidAction: { en: "That room action is invalid.", ms: "Tindakan dalam bilik itu tidak sah." },
  placesUnconfigured: { en: "Web search is not configured. Turn off automatic suggestions to create a room with host suggestions.", ms: "Carian web belum dikonfigurasi. Matikan cadangan automatik untuk mencipta bilik dengan cadangan hos." },
  placesUnavailable: { en: "Automatic search is temporarily unavailable. Try again or create a room with host suggestions.", ms: "Carian automatik tidak tersedia buat sementara waktu. Cuba lagi atau buat bilik dengan cadangan hos." },
  roomExpired: { en: "This room is unavailable or has expired.", ms: "Bilik ini tidak tersedia atau sudah tamat tempoh." },
  legacyRoomUnavailable: { en: "This room used the previous restaurant provider. Create a new room to get web suggestions.", ms: "Bilik ini menggunakan penyedia restoran lama. Cipta bilik baharu untuk mendapatkan cadangan daripada carian web." },
  alreadyStarted: { en: "The round has already started. You can follow the result.", ms: "Pusingan sudah bermula. Anda masih boleh melihat keputusannya." },
  roomFull: { en: "This room is full.", ms: "Bilik ini sudah penuh." },
  joinFirst: { en: "Join the room first.", ms: "Sertai bilik dahulu." },
  hostOnly: { en: "Only the host can start the round.", ms: "Hanya hos boleh memulakan pusingan." },
  unknownPlace: { en: "That restaurant is outside this round.", ms: "Restoran itu tidak termasuk dalam pusingan ini." },
  votingClosed: { en: "Voting is closed.", ms: "Undian sudah ditutup." },
  duplicateVote: { en: "You already voted on this restaurant.", ms: "Anda sudah mengundi restoran ini." },
  specialVoteUsed: { en: "You already used that vote this round.", ms: "Anda sudah menggunakan undi itu dalam pusingan ini." },
  serverError: { en: "Something went wrong. Try again in a moment.", ms: "Ada masalah. Cuba lagi sebentar lagi." },
  networkError: { en: "Couldn't reach Make Mano. Check your connection and try again.", ms: "Tak dapat menyambung ke Make Mano. Semak sambungan anda dan cuba lagi." },
  locationUnavailable: { en: "Location is unavailable. Type your city or neighborhood.", ms: "Lokasi tidak tersedia. Taip nama bandar atau kawasan anda." },
  locationDenied: { en: "Location access was denied. Type your city or neighborhood.", ms: "Akses lokasi disekat. Taip nama bandar atau kawasan anda." },
  locationNotFound: { en: "Couldn't find your location. Type your city or neighborhood.", ms: "Lokasi anda tidak dapat dikesan. Taip nama bandar atau kawasan anda." },
  chooseArea: { en: "Enter an area or use your location.", ms: "Masukkan nama kawasan atau gunakan lokasi anda." },
};

export type ErrorCode = keyof typeof errors;

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && Object.hasOwn(errors, value);
}

export class RoomError extends Error {
  constructor(public code: ErrorCode, public status = 400) {
    super(errors[code].en);
  }
}
