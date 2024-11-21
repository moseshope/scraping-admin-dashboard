const bcrypt = require('bcryptjs');
const { TABLES, put, get, query } = require('../config/dynamodb');
const logger = require('../utils/logger');

class UserModel {
  constructor() {
    this.tableName = TABLES.USERS;
  }

  /**
   * Create a new user
   * @param {Object} userData - User data including email and password
   * @returns {Promise<Object>} Created user object (without password)
   */
  async createUser(userData) {
    try {
      // Check if user already exists
      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser) {
        throw new Error('User already exists');
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Prepare user object
      const user = {
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        name: userData.name || '',
        role: userData.role || 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save user to DynamoDB
      await put(this.tableName, user);

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null if not found
   */
  async getUserByEmail(email) {
    try {
      const user = await get(this.tableName, { email: email.toLowerCase() });
      return user || null;
    } catch (error) {
      logger.error('Error getting user by email:', error);
      throw error;
    }
  }

  /**
   * Validate user credentials
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object|null>} User object without password if valid, null otherwise
   */
  async validateCredentials(email, password) {
    try {
      const user = await this.getUserByEmail(email);
      if (!user) {
        return null;
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return null;
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      logger.error('Error validating credentials:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {string} email - User email
   * @param {Object} updateData - Data to update (excluding email and password)
   * @returns {Promise<Object>} Updated user object without password
   */
  async updateUser(email, updateData) {
    try {
      const user = await this.getUserByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }

      // Prevent updating email and password through this method
      const { email: _, password: __, ...allowedUpdates } = updateData;

      const updatedUser = {
        ...user,
        ...allowedUpdates,
        updatedAt: new Date().toISOString(),
      };

      await put(this.tableName, updatedUser);

      // Return user without password
      const { password: ___, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Change user password
   * @param {string} email - User email
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} True if password was changed successfully
   */
  async changePassword(email, currentPassword, newPassword) {
    try {
      const user = await this.validateCredentials(email, currentPassword);
      if (!user) {
        throw new Error('Invalid current password');
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      await this.updateUser(email, {
        password: hashedPassword,
      });

      return true;
    } catch (error) {
      logger.error('Error changing password:', error);
      throw error;
    }
  }
}

module.exports = new UserModel();