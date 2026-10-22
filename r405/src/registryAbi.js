export const registryAbi = [
  "function nextPulseId() view returns (uint256)",
  "function pulses(uint256) view returns (address submitter,string slug,string metadataURI,uint64 createdAt,uint32 attestations,bool active)",
  "function submitPulse(string slug,string metadataURI) returns (uint256)",
  "error DuplicateSlug()",
  "error EmptySlug()",
];
