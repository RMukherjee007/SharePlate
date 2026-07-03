CREATE TABLE Users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255),
  base_city VARCHAR(100),
  latitude DECIMAL(10, 6),
  longitude DECIMAL(10, 6),
  is_verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE Dietary_Tags (
  tag_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE Food_Batches (
  batch_id INT AUTO_INCREMENT PRIMARY KEY,
  donor_id INT NOT NULL,
  description TEXT,
  batch_type VARCHAR(100),
  weight_kg DECIMAL(10, 2),
  expiry_timestamp DATETIME,
  status VARCHAR(50) DEFAULT 'available',
  delivery_city VARCHAR(100),
  donor_name VARCHAR(255),
  pickup_address VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (donor_id) REFERENCES Users(user_id)
);

CREATE TABLE Batch_Tags (
  batch_id INT,
  tag_id INT,
  PRIMARY KEY (batch_id, tag_id),
  FOREIGN KEY (batch_id) REFERENCES Food_Batches(batch_id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES Dietary_Tags(tag_id) ON DELETE CASCADE
);

CREATE TABLE Claims (
  claim_id INT AUTO_INCREMENT PRIMARY KEY,
  batch_id INT NOT NULL,
  charity_id INT NOT NULL,
  charity_name VARCHAR(255),
  charity_address VARCHAR(255),
  pickup_status VARCHAR(50) DEFAULT 'pending',
  claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES Food_Batches(batch_id),
  FOREIGN KEY (charity_id) REFERENCES Users(user_id)
);

CREATE TABLE Feedback_Reviews (
  review_id INT AUTO_INCREMENT PRIMARY KEY,
  claim_id INT NOT NULL,
  reviewer_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (claim_id) REFERENCES Claims(claim_id),
  FOREIGN KEY (reviewer_id) REFERENCES Users(user_id)
);
