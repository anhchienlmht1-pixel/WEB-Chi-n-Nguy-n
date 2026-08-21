/**
 * Provider Management Routes
 *
 * Endpoints for discovering and managing data providers:
 * - GET /providers - List all providers
 * - GET /providers/registry - Get registry statistics
 * - GET /providers/market - Get market data providers
 * - GET /providers/reference - Get reference data providers
 * - POST /providers/:id/enable - Enable a provider
 * - POST /providers/:id/disable - Disable a provider
 */

import { Router, Request, Response, NextFunction } from "express";
import { ProviderManagement } from "../api/unified.js";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);
}

/**
 * GET /providers/registry
 * Get detailed registry statistics
 */
router.get(
  "/registry",
  asyncHandler(async (_req, res) => {
    const stats = ProviderManagement.getStats();
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      registry: stats,
    });
  })
);

/**
 * GET /providers
 * List all registered providers with details
 */
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const providers = ProviderManagement.getAll();
    res.json({
      status: "ok",
      count: providers.length,
      providers,
    });
  })
);

/**
 * GET /providers/market
 * List market data providers (explorers)
 */
router.get(
  "/market",
  asyncHandler(async (_req, res) => {
    const providers = ProviderManagement.getByCategory("explorer");
    res.json({
      status: "ok",
      category: "market",
      count: providers.length,
      providers,
    });
  })
);

/**
 * GET /providers/reference
 * List reference data providers (connectors)
 */
router.get(
  "/reference",
  asyncHandler(async (_req, res) => {
    const providers = ProviderManagement.getByCategory("connector");
    res.json({
      status: "ok",
      category: "reference",
      count: providers.length,
      providers,
    });
  })
);

/**
 * POST /providers/:id/enable
 * Enable a specific provider
 */
router.post(
  "/:id/enable",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const stats = ProviderManagement.setEnabled(id, true);
    res.json({
      status: "ok",
      action: "enable",
      providerId: id,
      registry: stats,
    });
  })
);

/**
 * POST /providers/:id/disable
 * Disable a specific provider
 */
router.post(
  "/:id/disable",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const stats = ProviderManagement.setEnabled(id, false);
    res.json({
      status: "ok",
      action: "disable",
      providerId: id,
      registry: stats,
    });
  })
);

export default router;
