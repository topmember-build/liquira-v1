/**
 * Database schemas and models
 * Defines PostgreSQL tables for transaction tracking
 */

/**
 * SQL Migrations
 * These would typically be run via a migration tool (e.g., Flyway, Migrations)
 * For now, they're documented here and should be run manually or via ORM
 */

export const migrations = {
  /**
   * Create transactions table
   */
  createTransactionsTable: `
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      source_chain VARCHAR(50) NOT NULL,
      destination_chain VARCHAR(50) NOT NULL,
      source_token VARCHAR(100) NOT NULL,
      destination_token VARCHAR(100) NOT NULL,
      source_amount NUMERIC NOT NULL,
      status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'routed', 'executing', 'completed', 'failed')),
      route_id UUID,
      execution_plan_id UUID,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP,
      error_message TEXT,
      
      CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
    );
    CREATE INDEX idx_transactions_user_id ON transactions(user_id);
    CREATE INDEX idx_transactions_status ON transactions(status);
    CREATE INDEX idx_transactions_created_at ON transactions(created_at);
  `,

  /**
   * Create routes table
   */
  createRoutesTable: `
    CREATE TABLE IF NOT EXISTS routes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      transaction_id UUID NOT NULL,
      provider_id VARCHAR(50) NOT NULL,
      route_data JSONB NOT NULL,
      execution_steps JSONB,
      estimated_output NUMERIC NOT NULL,
      estimated_fees NUMERIC NOT NULL,
      estimated_time INTEGER NOT NULL,
      slippage_percent DECIMAL(5, 2) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      
      CONSTRAINT fk_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_routes_transaction_id ON routes(transaction_id);
    CREATE INDEX idx_routes_provider_id ON routes(provider_id);
  `,

  /**
   * Create quotes table
   */
  createQuotesTable: `
    CREATE TABLE IF NOT EXISTS quotes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      transaction_id UUID NOT NULL,
      provider_id VARCHAR(50) NOT NULL,
      quote_data JSONB NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      
      CONSTRAINT fk_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_quotes_transaction_id ON quotes(transaction_id);
    CREATE INDEX idx_quotes_created_at ON quotes(created_at);
  `,

  /**
   * Create execution logs table
   */
  createExecutionLogsTable: `
    CREATE TABLE IF NOT EXISTS execution_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      transaction_id UUID NOT NULL,
      event VARCHAR(50) NOT NULL,
      provider_response JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      
      CONSTRAINT fk_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_execution_logs_transaction_id ON execution_logs(transaction_id);
    CREATE INDEX idx_execution_logs_event ON execution_logs(event);
  `,

  /**
   * Create execution plans table
   */
  createExecutionPlansTable: `
    CREATE TABLE IF NOT EXISTS execution_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      route_id UUID NOT NULL,
      transaction_id UUID NOT NULL,
      steps JSONB NOT NULL,
      arc_payload JSONB NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      
      CONSTRAINT fk_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      CONSTRAINT fk_route FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_execution_plans_transaction_id ON execution_plans(transaction_id);
  `,

  /**
   * Create user preferences table (for optimization strategy preferences)
   */
  createUserPreferencesTable: `
    CREATE TABLE IF NOT EXISTS user_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE,
      default_strategy VARCHAR(50) DEFAULT 'lowest-fee',
      max_slippage_percent DECIMAL(5, 2) DEFAULT 1.0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      
      CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
  `,
};

/**
 * ORM Models (using raw SQL queries)
 */

export interface TransactionModel {
  create(data: {
    userId: string;
    sourceChain: string;
    destinationChain: string;
    sourceToken: string;
    destinationToken: string;
    sourceAmount: string;
  }): Promise<string>; // Returns transaction ID

  findById(id: string): Promise<any>;
  findByUserId(userId: string, limit?: number): Promise<any[]>;
  updateStatus(id: string, status: string): Promise<void>;
  updateWithRoute(
    id: string,
    routeId: string,
    status: string
  ): Promise<void>;
  markCompleted(id: string, completedAt: Date): Promise<void>;
  markFailed(id: string, errorMessage: string): Promise<void>;
}

export interface RouteModel {
  create(data: {
    transactionId: string;
    providerId: string;
    routeData: any;
    executionSteps: any;
    estimatedOutput: string;
    estimatedFees: string;
    estimatedTime: number;
    slippagePercent: number;
  }): Promise<string>; // Returns route ID

  findById(id: string): Promise<any>;
  findByTransactionId(transactionId: string): Promise<any[]>;
}

export interface QuoteModel {
  create(data: {
    transactionId: string;
    providerId: string;
    quoteData: any;
  }): Promise<string>; // Returns quote ID

  findByTransactionId(transactionId: string): Promise<any[]>;
}

export interface ExecutionLogModel {
  create(data: {
    transactionId: string;
    event: string;
    providerResponse?: any;
  }): Promise<void>;

  findByTransactionId(transactionId: string): Promise<any[]>;
}

/**
 * Database Query Helpers
 * (These would be implemented using a query builder or ORM)
 */

export const queries = {
  // Transaction queries
  transaction: {
    insert: `
      INSERT INTO transactions 
        (user_id, source_chain, destination_chain, source_token, destination_token, source_amount, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id;
    `,
    findById: `
      SELECT * FROM transactions WHERE id = $1;
    `,
    findByUserId: `
      SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2;
    `,
    updateStatus: `
      UPDATE transactions SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1;
    `,
    updateWithRoute: `
      UPDATE transactions 
      SET route_id = $2, status = $3, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1;
    `,
    markCompleted: `
      UPDATE transactions 
      SET status = 'completed', completed_at = $2, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1;
    `,
    markFailed: `
      UPDATE transactions 
      SET status = 'failed', error_message = $2, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1;
    `,
  },

  // Route queries
  route: {
    insert: `
      INSERT INTO routes 
        (transaction_id, provider_id, route_data, execution_steps, estimated_output, estimated_fees, estimated_time, slippage_percent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id;
    `,
    findById: `
      SELECT * FROM routes WHERE id = $1;
    `,
    findByTransactionId: `
      SELECT * FROM routes WHERE transaction_id = $1 ORDER BY created_at DESC;
    `,
  },

  // Quote queries
  quote: {
    insert: `
      INSERT INTO quotes (transaction_id, provider_id, quote_data)
      VALUES ($1, $2, $3)
      RETURNING id;
    `,
    findByTransactionId: `
      SELECT * FROM quotes WHERE transaction_id = $1 ORDER BY created_at DESC;
    `,
  },

  // Execution log queries
  executionLog: {
    insert: `
      INSERT INTO execution_logs (transaction_id, event, provider_response)
      VALUES ($1, $2, $3);
    `,
    findByTransactionId: `
      SELECT * FROM execution_logs WHERE transaction_id = $1 ORDER BY created_at ASC;
    `,
  },
};

export default {
  migrations,
  queries,
};
