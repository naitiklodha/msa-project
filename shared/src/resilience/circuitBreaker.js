'use strict';

const logger = require('../logger');

/**
 * A basic safety switch for failing services. We trip the circuit 
 * if things go south too many times so we don't accidentally hammer 
 * a service that's already struggling.
 *
 * Usage:
 *   const breaker = new CircuitBreaker({ failureThreshold: 5, resetTimeout: 30000 });
 *   const result = await breaker.fire(() => axios.get('http://...'));
 */
class CircuitBreaker {
  constructor({ failureThreshold = 5, resetTimeout = 30000, name = 'default' } = {}) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.name = name;

    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }

  /**
   * Run your function through the breaker. If the circuit is open, we'll
   * just fail fast instead of wasting time.
   */
  async fire(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
        logger.info({ msg: 'Circuit breaker HALF_OPEN', breaker: this.name });
      } else {
        const err = new Error('Circuit breaker is OPEN');
        err.code = 'SERVICE_UNAVAILABLE';
        err.status = 503;
        throw err;
      }
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure();
      throw err;
    }
  }

  _onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      // We need 2 successes in a row before we trust the service enough to close
      if (this.successCount >= 2) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        logger.info({ msg: 'Circuit breaker CLOSED', breaker: this.name });
      }
    } else {
      this.failureCount = 0;
    }
  }

  _onFailure() {
    this.failureCount++;
    this.successCount = 0;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.warn({
        msg: 'Circuit breaker OPEN',
        breaker: this.name,
        failureCount: this.failureCount,
      });
    }
  }

  getState() {
    return this.state;
  }
}

module.exports = { CircuitBreaker };
