/**
 * Tests for R2 storage utility
 * Handles avatar uploads to Cloudflare R2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Track mock send calls
const mockSend = vi.fn();

// Mock S3Client at module level
vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: class MockS3Client {
      send = mockSend;
    },
    PutObjectCommand: class MockPutObjectCommand {
      constructor(public params: unknown) {}
    },
    DeleteObjectCommand: class MockDeleteObjectCommand {
      constructor(public params: unknown) {}
    },
  };
});

import {
  uploadAvatar,
  deleteAvatar,
  getAvatarUrl,
  downloadAndUploadAvatar,
} from './r2-storage';

describe('R2 Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockReset();
    mockFetch.mockReset();

    // Set environment variables
    process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id';
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = 'test-access-key';
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.CLOUDFLARE_R2_BUCKET = 'test-bucket';
    process.env.CLOUDFLARE_R2_PUBLIC_URL = 'https://pub-test.r2.dev';
  });

  afterEach(() => {
    // Restore env vars
    process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id';
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = 'test-access-key';
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.CLOUDFLARE_R2_BUCKET = 'test-bucket';
    process.env.CLOUDFLARE_R2_PUBLIC_URL = 'https://pub-test.r2.dev';
  });

  describe('getAvatarUrl', () => {
    it('returns public URL for a linkedin ID', () => {
      const url = getAvatarUrl('john-doe');
      expect(url).toBe('https://pub-test.r2.dev/avatars/john-doe.jpg');
    });

    it('handles special characters in linkedin ID', () => {
      const url = getAvatarUrl('john_doe-123');
      expect(url).toBe('https://pub-test.r2.dev/avatars/john_doe-123.jpg');
    });

    it('returns null when public URL is not configured', () => {
      delete process.env.CLOUDFLARE_R2_PUBLIC_URL;
      const url = getAvatarUrl('john-doe');
      expect(url).toBeNull();
    });
  });

  describe('uploadAvatar', () => {
    it('uploads buffer to R2 with correct key', async () => {
      mockSend.mockResolvedValue({});

      const buffer = Buffer.from('fake-image-data');
      const result = await uploadAvatar('john-doe', buffer);

      expect(result.success).toBe(true);
      expect(result.path).toBe('avatars/john-doe.jpg');
      expect(mockSend).toHaveBeenCalled();
    });

    it('returns error when upload fails', async () => {
      mockSend.mockRejectedValue(new Error('Upload failed'));

      const buffer = Buffer.from('fake-image-data');
      const result = await uploadAvatar('john-doe', buffer);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });

    it('returns error when R2 is not configured', async () => {
      delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;

      const buffer = Buffer.from('fake-image-data');
      const result = await uploadAvatar('john-doe', buffer);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });
  });

  describe('deleteAvatar', () => {
    it('deletes avatar from R2', async () => {
      mockSend.mockResolvedValue({});

      const result = await deleteAvatar('john-doe');

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });

    it('returns error when delete fails', async () => {
      mockSend.mockRejectedValue(new Error('Delete failed'));

      const result = await deleteAvatar('john-doe');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });
  });

  describe('downloadAndUploadAvatar', () => {
    it('downloads image from URL and uploads to R2', async () => {
      // Mock fetch to return image data
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
        headers: new Headers({ 'content-type': 'image/jpeg' }),
      });
      mockSend.mockResolvedValue({});

      const result = await downloadAndUploadAvatar(
        'john-doe',
        'https://linkedin.com/avatar.jpg'
      );

      expect(result.success).toBe(true);
      expect(result.path).toBe('avatars/john-doe.jpg');
      expect(mockFetch).toHaveBeenCalledWith('https://linkedin.com/avatar.jpg');
    });

    it('returns error when download fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await downloadAndUploadAvatar(
        'john-doe',
        'https://linkedin.com/avatar.jpg'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to download');
    });

    it('returns error when URL is invalid', async () => {
      const result = await downloadAndUploadAvatar('john-doe', 'not-a-url');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL');
    });

    it('handles upload after successful download', async () => {
      // Mock fetch to return image
      const imageData = new ArrayBuffer(100);
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(imageData),
        headers: new Headers({ 'content-type': 'image/jpeg' }),
      });
      mockSend.mockResolvedValue({});

      const result = await downloadAndUploadAvatar(
        'john-doe',
        'https://linkedin.com/avatar.jpg'
      );

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });
  });
});
