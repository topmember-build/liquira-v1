-- Create transactions table
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
  error_message TEXT
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- Create routes table
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

-- Create quotes table
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

-- Create execution logs table
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

-- Create execution plans table
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

-- Create user preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  default_strategy VARCHAR(50) DEFAULT 'lowest-fee',
  max_slippage_percent DECIMAL(5, 2) DEFAULT 1.0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
