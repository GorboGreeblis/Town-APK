# What putting the game on chain would cost (estimate, 2026-11-07)

The author: "Estimate the costs of uploading index-compressed as a Bitcoin ordinal (https://ordiscan.com/inscribe). And
of uploading it to the Eth chain (https://ethfs.xyz/mainnet)." The file: `index.compressed.html`, 291,674 bytes (the
final build 4.0.63; it unpacks to the game file exactly and works as an inscription: `test_compressed.js`, which
serves it under ordinals.com's content policy, as `/content/<id>` and in the explorers' sandboxed preview).

Prices read 2026-11-07 about 01:20-01:25 UTC: BTC US$75,759 / C$107,077 (mempool.space); Bitcoin fee rates fastest 5,
half hour 4, hour 3, economy 2, minimum 1 sat/vB (mempool.space); ETH US$2,239.75 and gas 0.045-0.048 gwei
(etherscan.io gas tracker). CAD at the same moment's rate, 1 USD = 1.413 CAD. Both chains' fees move by the hour and
were unusually low at this reading: the tables give a range.

## Bitcoin ordinal (ordiscan.com/inscribe)

One inscription, `text/html;charset=utf-8`: the file goes in the reveal transaction's witness (a quarter of the
weight of other data), pushed in 520-byte pieces (561 pieces, 3 bytes each to push).

- Reveal transaction: about 293,900 weight units, **about 73,480 vB**; the commit transaction about 150 vB: **about
  73,630 vB in all**. Under Bitcoin's 400,000-weight-unit limit for a standard transaction: one inscription, no
  splitting needed.
- Network fee = vB x fee rate:

| Fee rate | sats | US$ | C$ | |
| --- | --- | --- | --- | --- |
| 1 sat/vB | 73,631 | 56 | 79 | minimum: may wait hours or days |
| 2 sat/vB | 147,262 | 112 | 158 | economy (now) |
| 3 sat/vB | 220,893 | 167 | 237 | within the hour (now) |
| 5 sat/vB | 368,155 | 279 | 394 | next block (now) |
| 10 sat/vB | 736,310 | 558 | 788 | a busier day |
| 20 sat/vB | 1,472,620 | 1,116 | 1,577 | busy |
| 50 sat/vB | 3,681,550 | 2,789 | 3,942 | very busy (2023-2024 peaks went higher) |

- Plus the postage (the sats the inscription sits on): 330-10,000 sats, C$0.35-10.70.
- Plus ordiscan's own service fee: **not known** (its inscribe page refuses automated reading, HTTP 403). Other
  services charge a flat fee of a few thousand sats or a few percent of the network fee (OrdinalsBot's published
  pricing, for comparison); the page shows its total before paying.
- **The author always inscribes at 1 sat/vB** (2026-11-07): **73,631 sats, about C$79 (US$56)** at today's price, plus
  postage and ordiscan's fee. At 1 sat/vB the transactions confirm when blocks have room below that rate (the
  mempool's minimum was 0.1 sat/vB at this reading, so it relays); that can take hours or longer on a busy day.
- At faster rates today: about C$160-400 (US$110-280) for economy to next-block.

## Ethereum (EthFS, ethfs.xyz/mainnet)

EthFS stores a file as contract bytecode (the SSTORE2 method): the page splits it into 24 KB pieces (the largest
contract), each deployed to a fixed address through the Safe Singleton Factory, then registers the file in its
FileStore (`0xFe1411d6864592549AdE050215482e4385dFa0FB`, the same address on mainnet and the L2s).

- 291,674 bytes = **12 pieces** (12 transactions) plus the file's registration.
- Gas: storing code costs 200 gas a byte, plus 16 a byte to send it (the file is text: no zero bytes), plus each
  piece's creation and transaction cost: **about 64 million gas** in all. (The 2025 calldata floor, EIP-7623, costs
  40 gas a byte, less than this, so it does not raise it.)

| Gas price | ETH | US$ | C$ | |
| --- | --- | --- | --- | --- |
| 0.045 gwei | 0.0029 | 6.46 | 9.13 | now |
| 0.1 gwei | 0.0064 | 14 | 20 | |
| 0.5 gwei | 0.032 | 72 | 101 | |
| 1 gwei | 0.064 | 144 | 203 | |
| 2 gwei | 0.128 | 287 | 406 | |
| 5 gwei | 0.321 | 718 | 1,015 | |
| 10 gwei | 0.641 | 1,436 | 2,029 | busy (2024 levels) |

- **At today's gas: about C$9 (US$6.50)**; EthFS charges no fee of its own that its page or README shows. The full,
  uncompressed `index.html` (1,140,989 bytes) would cost about four times as much (about C$35 now).
- Playing it from Ethereum needs a page that serves the stored file as a web page (EthFS stores bytes; ethfs.xyz lists
  and downloads files). Not tested here: the ordinal version is the one tested as a web page from a chain.

## How sure

- Bitcoin: the size is computed from the inscription format and is close (a few hundred vB either way); the network fee
  is then exact for a given fee rate. The unknown is ordiscan's service fee.
- Ethereum: within about 5% for a given gas price (the factory's and the registration's exact gas not read from the
  contracts). The unknown is the gas price on the day.
- Both: prices and fees on 2026-11-07; read them again on the day of upload.

## Sources

- [mempool.space fee rates](https://mempool.space/api/v1/fees/recommended) and [prices](https://mempool.space/api/v1/prices) (read 2026-11-07 01:20 UTC)
- [Etherscan gas tracker](https://etherscan.io/gastracker) (2026-11-07 01:24 UTC)
- [ordiscan.com/inscribe](https://ordiscan.com/inscribe) (not readable automatically)
- [ord: inscriptions](https://docs.ordinals.com/inscriptions) (the envelope format)
- [OrdinalsBot: direct inscription order](https://docs.ordinalsbot.com/api/create-a-direct-inscription-order) and [getting prices](https://docs.ordinalsbot.com/api/getting-prices) (postage range, a comparable service fee)
- [EthFS](https://github.com/holic/ethfs) and [ethfs.xyz](https://ethfs.xyz/mainnet)
- [SSTORE2](https://github.com/0xsequence/sstore2)
