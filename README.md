# Liquira – Stablecoin FX Rail

> **Liquira is the on-chain liquidity router for stablecoin FX. Quote, swap, schedule and automate stablecoin moves with deep liquidity and developer-grade APIs.**

Liquira abstracts the complexity of cross-chain stablecoin transfers by aggregating quotes from multiple routing providers, optimizing execution paths, and settling transactions directly on-chain via the Arc network.

## 🚀 Key Features

- **Multi-Provider Quote Aggregation** – Fetch quotes from LiFi, Socket, and Relay APIs in parallel
- **Intelligent Route Optimization** – Automatic scoring, filtering by slippage tolerance, and path ranking
- **Live Wallet Balance Updates** – Real-time balance refresh for connected injected wallets without page reload
- **Responsive Design** – Desktop, tablet, and mobile-first UI with adaptive navigation
- **Transaction Tracking** – Full lifecycle monitoring with Supabase real-time updates
- **Private Beta Gating** – Invite code validation and admin access controls
- **Live Notifications** – Transaction, payment, and security event alerts in the notification center
- **Developer APIs** – RESTful quote and execute endpoints for programmatic access

## 🏗️ Architecture

```
Frontend (React + TanStack Router)
         ↓ HTTP API
Backend (TanStack Start – Node.js)
         ↓ Call Arc / Circle / Supabase
External Services (Arc, Circle, Supabase)
         ↓ On-chain execution
Arc Network (ERC-20 Transfers)
```

**Core Principle:** *We route. ARC executes.*

- **Frontend**: Authentication, quote display, transaction status polling, wallet connection
- **Backend**: Quote aggregation, route optimization, execution orchestration, transaction tracking
- **Storage**: Supabase for transaction history, user preferences, and beta access management
- **Execution**: Arc Testnet for ERC-20 transfers and settlement

## 🛠️ Tech Stack

### Frontend
- **React 19** with TypeScript
- **TanStack Router** for client-side routing
- **TailwindCSS** for styling (terminal/fintech aesthetic)
- **Wagmi + Viem** for wallet integration
- **Dynamic Labs** for embedded wallet support
- **Recharts** for analytics and depth visualizations
- **Sonner** for toast notifications
- **Radix UI** component primitives

### Backend
- **TanStack Start** (Node.js-based meta-framework)
- **Supabase** for PostgreSQL database and real-time subscriptions
- **Zod** for runtime type validation
- **TypeScript** for type safety

### Infrastructure
- **Vite** for build tooling
- **ESLint + Prettier** for code quality
- **Bun** package manager (lockfile included)

## 📦 Getting Started

### Prerequisites
- Node.js 18+
- Bun 1.0+ or npm/yarn
- A Supabase project (for backend)
- Environment variables (see `.env.example`)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/topmember-build/liquira-v1.git
   cd liquira-v1
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or npm install / yarn install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys and service URLs
   ```

4. **Run the development server**
   ```bash
   bun run dev
   # or npm run dev
   ```
   Visit `http://localhost:5173` in your browser.

## 📂 Project Structure

```
liquira-v1/
├── src/
│   ├── components/          # React UI components
│   │   ├── site/           # Landing page components
│   │   ├── payment/        # Payment flow components
│   │   ├── account/        # User account components
│   │   ├── auth/           # Authentication UI
│   │   └── ui/             # Radix UI primitive wrappers
│   ├── contexts/           # React context providers
│   │   ├── AuthContext.tsx
│   │   ├── WalletContext.tsx
│   │   ├── PaymentContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── ...
│   ├── hooks/              # Custom React hooks
│   │   ├── useBackendAPI.ts
│   │   ├── useRealtimeTransactions.ts
│   │   ├── usePermitSignature.ts
│   │   └── use-mobile.tsx
│   ├── routes/             # TanStack Router route handlers
│   │   ├── __root.tsx      # Root layout & app shell
│   │   ├── index.tsx       # Landing page
│   │   ├── account.tsx     # Account dashboard
│   │   ├── payment.tsx     # Payment execution
│   │   ├── fx.quote.ts     # Quote API endpoint
│   │   ├── fx.execute.ts   # Execute API endpoint
│   │   └── ...
│   ├── server/             # Server-side functions
│   │   ├── fx-engine.server.ts
│   │   ├── transaction-service.server.ts
│   │   ├── wallets.functions.ts
│   │   └── ...
│   ├── backend/            # Backend routing & services
│   │   ├── routes/         # Quote, execute, webhook routes
│   │   ├── services/       # Quote engine, route optimizer
│   │   └── ...
│   ├── lib/                # Utility functions & configs
│   │   ├── stables.ts
│   │   ├── tokens.ts
│   │   ├── fx-service.ts
│   │   └── ...
│   ├── integrations/       # Third-party integrations
│   │   ├── supabase/
│   │   ├── dynamic/
│   │   └── lovable/
│   ├── styles.css          # Global Tailwind + custom CSS
│   ├── routeTree.gen.ts    # Auto-generated route tree
│   └── router.tsx          # TanStack Router config
├── supabase/               # Supabase migrations & config
│   ├── migrations/         # SQL migration files
│   └── config.toml
├── public/                 # Static assets
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
├── package.json
└── README.md
```

## 🔄 Feature Roadmap

### Current (v1)
- ✅ Quote aggregation (LiFi, Socket, Relay)
- ✅ Route optimization and ranking
- ✅ Live wallet balance updates
- ✅ Responsive UI (desktop, tablet, mobile)
- ✅ Transaction tracking with Supabase realtime
- ✅ Private beta gating with invite codes
- ✅ Live notification system

### In Progress
- 🔄 Scheduled payment execution
- 🔄 Payment automation rules (recurring transfers)
- 🔄 Enhanced analytics dashboard
- 🔄 Advanced slippage protection

### Planned
- 🗓️ Fireblocks custody integration
- 🗓️ Circle stablecoin treasury health checks
- 🗓️ Multi-signature transaction approval
- 🗓️ Developer SDK and webhooks

## 🧪 Development

### Running Tests
```bash
bun run test
# or npm test
```

### Linting & Formatting
```bash
bun run lint        # Run ESLint
bun run format      # Auto-format with Prettier
```

### Build for Production
```bash
bun run build       # Create optimized build
bun run preview     # Preview production build locally
```

## 🔑 Environment Variables

Create a `.env.local` file with:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
# or alias for projects still using the legacy anon key name
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Dynamic Labs (Embedded Wallets)
VITE_DYNAMIC_ENV_ID=your_dynamic_env_id

# RPC Endpoints
VITE_ARC_RPC_URL=https://rpc.testnet.arc.network
VITE_MAINNET_RPC_URL=https://rpc.mainnet.example.com

# API Keys
VITE_LIFI_API_KEY=your_lifi_key
VITE_SOCKET_API_KEY=your_socket_key
VITE_RELAY_API_KEY=your_relay_key

# Optional
VITE_WALLETCONNECT_PROJECT_ID=your_wc_project_id
```

## 📚 API Endpoints

### Quote Endpoint
**POST** `/fx/quote`

Request:
```json
{
  "sourceToken": "USDC",
  "destinationToken": "EURC",
  "amount": "1000",
  "sourceChain": "arc-testnet",
  "destinationChain": "arc-testnet"
}
```

Response:
```json
{
  "id": "quote-123",
  "routes": [
    {
      "provider": "lifi",
      "fromAmount": "1000000000",
      "toAmount": "998500000",
      "slippage": 0.15,
      "steps": [...]
    }
  ]
}
```

### Execute Endpoint
**POST** `/fx/execute`

Request:
```json
{
  "quoteId": "quote-123",
  "selectedRoute": 0,
  "recipientAddress": "0x...",
  "walletAddress": "0x..."
}
```

Response:
```json
{
  "transactionId": "tx-456",
  "status": "pending",
  "estimatedTime": 120
}
```

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- **Formatting**: Prettier (enforced in pre-commit)
- **Linting**: ESLint + TypeScript
- **Type Safety**: Full TypeScript coverage required
- **Component Structure**: Functional components with hooks

## 📖 Documentation

- [Backend Architecture](./BACKEND_ARCHITECTURE.md) – Detailed backend design
- [Architecture Constraints](./ARCHITECTURE_CONSTRAINTS.md) – System layering and boundaries
- [Backend Module Guide](./BACKEND_MODULE_GUIDE.md) – Module structure and responsibilities
- [ARC Deployment](./ARC_DEPLOYMENT.md) – Deployment and integration guide
- [Supabase Setup](./SUPABASE_CIRCLE_SETUP.md) – Database schema and migration guide

## 📄 License

This project is licensed under the MIT License – see the [LICENSE](./LICENSE) file for details.

## 🙋 Support

For questions or issues:
- Open an issue on GitHub
- Check existing documentation in the `/docs` folder
- Review the [Architecture Constraints](./ARCHITECTURE_CONSTRAINTS.md) for system boundaries

---

**Built with ❤️ by TopMember**
