const User = require('../models/user.model');
const GlobalSetting = require('../models/globalSetting.model');
const Plan = require('../models/plan.model');
const WorkspaceMember = require('../models/workspaceMember.model');

/**
 * Resolves the hierarchical permission for a specific feature.
 * Priority: User Override -> Admin Override -> Plan Limitation -> Global Setting
 */
const resolvePermission = async (userId, featureKey) => {
  try {
    const user = await User.findById(userId).populate({
      path: 'subscriptionId',
      populate: { path: 'planId' }
    });

    if (!user) return false;

    // 1. User-specific Override
    if (user.featurePermissions && user.featurePermissions[featureKey] !== null && user.featurePermissions[featureKey] !== undefined) {
      return user.featurePermissions[featureKey];
    }

    // 2. Admin-specific Override (if user is managed by an Admin)
    if (user.role === 'USER' && user.assignedAdminId) {
      const admin = await User.findById(user.assignedAdminId);
      if (admin && admin.featurePermissions && admin.featurePermissions[featureKey] !== null && admin.featurePermissions[featureKey] !== undefined) {
        return admin.featurePermissions[featureKey];
      }
    }

    // 3. Plan Limitation (if applicable to the feature)
    if (user.subscriptionId && user.subscriptionId.planId) {
      const plan = user.subscriptionId.planId;
      // Map featureKey to plan feature key if they differ (assuming they are named similarly for now)
      if (plan.features && typeof plan.features[featureKey] === 'boolean') {
        return plan.features[featureKey];
      }
    }

    // 4. Global Setting (Fallback)
    const settings = await GlobalSetting.findOne({ configId: 'global_config' });
    if (settings) {
       // Search across all global settings modules for this feature key
       // This requires mapping, but for now we look in 'ai', 'userAndAccount', etc.
       const allSettings = settings.toObject();
       for (const moduleKey in allSettings) {
         if (typeof allSettings[moduleKey] === 'object' && allSettings[moduleKey] !== null) {
           if (typeof allSettings[moduleKey][featureKey] === 'boolean') {
             return allSettings[moduleKey][featureKey];
           }
         }
       }
    }

    return false; // Default safe fallback
  } catch (err) {
    console.error('Error resolving permission:', err);
    return false;
  }
};

const requirePermission = (featureKey) => {
  return async (req, res, next) => {
    // Super admins always have access
    if (req.user && req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    const hasAccess = await resolvePermission(req.user._id, featureKey);
    if (!hasAccess) {
      return res.status(403).json({ message: `Access denied. You do not have permission for: ${featureKey}` });
    }
    
    next();
  };
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    // Convert all roles to lowercase for comparison to be safe
    const userRole = req.user.role.toLowerCase();
    const allowedRoles = roles.map(r => r.toLowerCase());
    
    if (!allowedRoles.includes(userRole) && userRole !== 'super_admin') {
      return res.status(403).json({ message: `Access denied. Requires role: ${roles.join(' or ')}` });
    }
    next();
  };
};

const requireWorkspaceAccess = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID is required for this action' });
    }
    if (req.user.role === 'SUPER_ADMIN') return next();

    const membership = await WorkspaceMember.findOne({ workspaceId, userId: req.user._id, status: 'ACTIVE' });
    if (!membership) {
      return res.status(403).json({ message: 'Access denied to this workspace' });
    }
    req.workspaceMembership = membership;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Workspace authorization error', error: error.message });
  }
};

const requireWorkspaceAdmin = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID is required' });
    }
    if (req.user.role === 'SUPER_ADMIN') return next();

    const membership = await WorkspaceMember.findOne({ workspaceId, userId: req.user._id, status: 'ACTIVE' });
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ message: 'Workspace admin access required' });
    }
    req.workspaceMembership = membership;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Workspace authorization error', error: error.message });
  }
};

module.exports = {
  resolvePermission,
  requirePermission,
  requireRole,
  requireWorkspaceAccess,
  requireWorkspaceAdmin
};
