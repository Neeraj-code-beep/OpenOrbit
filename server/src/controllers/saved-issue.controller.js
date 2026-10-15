import { SavedIssue } from '../models/saved-issue.model.js';
import { AppError } from '../utils/app-error.js';

/**
 * POST /api/v1/saved-issues
 * Saves an open-source issue to user's saved list
 */
export async function saveIssue(req, res) {
  const userId = req.user.id;
  const { issueId, number, title, bodySnippet, htmlUrl, state, repository, labels, notes } = req.body;

  if (!issueId || !number || !title || !htmlUrl || !repository?.owner || !repository?.name) {
    throw new AppError(
      'issueId, number, title, htmlUrl, and repository (owner, name) are required',
      400,
      'VALIDATION_ERROR'
    );
  }

  const fullName = repository.fullName || `${repository.owner}/${repository.name}`;

  try {
    const saved = await SavedIssue.findOneAndUpdate(
      {
        userId,
        'repository.fullName': fullName,
        number: Number(number),
      },
      {
        $setOnInsert: {
          userId,
          issueId: Number(issueId),
          number: Number(number),
          title: String(title).trim(),
          bodySnippet: bodySnippet ? String(bodySnippet).trim().slice(0, 1000) : '',
          htmlUrl: String(htmlUrl).trim(),
          state: state === 'closed' ? 'closed' : 'open',
          repository: {
            owner: String(repository.owner).trim(),
            name: String(repository.name).trim(),
            fullName,
          },
          labels: Array.isArray(labels)
            ? labels.map((l) => (typeof l === 'string' ? { name: l } : { name: l.name, color: l.color }))
            : [],
          notes: notes ? String(notes).trim().slice(0, 2000) : '',
          status: 'saved',
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json({
      success: true,
      message: 'Issue saved successfully',
      data: saved,
    });
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError('This issue is already saved in your collection', 409, 'ISSUE_ALREADY_SAVED');
    }
    throw err;
  }
}

/**
 * GET /api/v1/saved-issues
 * Lists all saved issues for the authenticated user with optional status filter & pagination
 */
export async function getSavedIssues(req, res) {
  const userId = req.user.id;
  const { status, repo, page = 1, per_page = 20 } = req.query;

  const query = { userId };
  if (status && ['saved', 'in_progress', 'completed', 'dismissed'].includes(status)) {
    query.status = status;
  }
  if (repo) {
    query['repository.fullName'] = String(repo).trim();
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(per_page) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [totalCount, issues] = await Promise.all([
    SavedIssue.countDocuments(query),
    SavedIssue.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
  ]);

  res.status(200).json({
    success: true,
    data: issues,
    pagination: {
      totalCount,
      page: pageNum,
      perPage: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
    },
  });
}

/**
 * GET /api/v1/saved-issues/:id
 * Fetches a single saved issue by its MongoDB ID
 */
export async function getSavedIssueById(req, res) {
  const { id } = req.params;
  const userId = req.user.id;

  const issue = await SavedIssue.findOne({ _id: id, userId });
  if (!issue) {
    throw new AppError('Saved issue not found', 404, 'NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: issue,
  });
}

/**
 * PATCH /api/v1/saved-issues/:id
 * Updates notes or status for a saved issue
 */
export async function updateSavedIssue(req, res) {
  const { id } = req.params;
  const userId = req.user.id;
  const { notes, status } = req.body || {};

  const updateFields = {};
  if (notes !== undefined) {
    updateFields.notes = String(notes).trim().slice(0, 2000);
  }
  if (status !== undefined) {
    if (!['saved', 'in_progress', 'completed', 'dismissed'].includes(status)) {
      throw new AppError("status must be 'saved', 'in_progress', 'completed', or 'dismissed'", 400, 'VALIDATION_ERROR');
    }
    updateFields.status = status;
  }

  if (Object.keys(updateFields).length === 0) {
    throw new AppError('No valid fields provided for update', 400, 'VALIDATION_ERROR');
  }

  const updated = await SavedIssue.findOneAndUpdate(
    { _id: id, userId },
    { $set: updateFields },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw new AppError('Saved issue not found', 404, 'NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    message: 'Saved issue updated successfully',
    data: updated,
  });
}

/**
 * DELETE /api/v1/saved-issues/:id
 * Removes an issue from user's saved list
 */
export async function deleteSavedIssue(req, res) {
  const { id } = req.params;
  const userId = req.user.id;

  const deleted = await SavedIssue.findOneAndDelete({ _id: id, userId });
  if (!deleted) {
    throw new AppError('Saved issue not found', 404, 'NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    message: 'Saved issue removed successfully',
  });
}
