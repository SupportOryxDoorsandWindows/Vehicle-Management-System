import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DriverPhotoPanel } from '../DriverPhotoPanel';
import * as driverPhotosApi from '../../api/driverPhotos';
import { useIsAdmin } from '../../lib/useIsAdmin';
import type { DriverPhotoWithUrl } from '../../api/driverPhotos';

vi.mock('../../lib/useIsAdmin', () => ({ useIsAdmin: vi.fn(() => false) }));

const photo = {
  id: 'p1', driver_key: 'ronald', driver_name: 'Ronald', storage_path: 'drivers/ronald/x.jpg',
  file_name: 'ronald.jpg', url: 'https://signed.example/ronald',
} as DriverPhotoWithUrl;

beforeEach(() => {
  vi.mocked(useIsAdmin).mockReturnValue(false);
  vi.spyOn(driverPhotosApi, 'fetchDriverPhoto').mockResolvedValue(null);
  vi.spyOn(driverPhotosApi, 'uploadDriverPhoto').mockResolvedValue(photo);
  vi.spyOn(driverPhotosApi, 'removeDriverPhoto').mockResolvedValue();
});

describe('DriverPhotoPanel', () => {
  it("shows the driver's uploaded photo, name and department", async () => {
    vi.spyOn(driverPhotosApi, 'fetchDriverPhoto').mockResolvedValue(photo);
    render(<DriverPhotoPanel driver="Ronald" department="Installation" />);
    await waitFor(() => expect(screen.getByRole('img', { name: 'Ronald' })).toHaveAttribute('src', photo.url));
    expect(driverPhotosApi.fetchDriverPhoto).toHaveBeenCalledWith('Ronald');
    expect(screen.getByText('Installation')).toBeInTheDocument();
  });

  it('falls back to the photo bundled with the app when none is uploaded', async () => {
    render(<DriverPhotoPanel driver="Chris Dawson" />);
    await waitFor(() => expect(driverPhotosApi.fetchDriverPhoto).toHaveBeenCalled());
    expect(screen.getByRole('img', { name: 'Chris Dawson' })).toHaveAttribute(
      'src',
      expect.stringContaining('driver-images/chris-dawson.png')
    );
  });

  it('shows a silhouette when no photo loads', async () => {
    render(<DriverPhotoPanel driver="Joel Pascua" />);
    const img = await screen.findByRole('img', { name: 'Joel Pascua' });
    img.dispatchEvent(new Event('error'));
    expect(await screen.findByRole('img', { name: 'No driver photo yet' })).toBeInTheDocument();
  });

  it('shows a Viewer no photo controls', async () => {
    vi.spyOn(driverPhotosApi, 'fetchDriverPhoto').mockResolvedValue(photo);
    render(<DriverPhotoPanel driver="Ronald" />);
    await waitFor(() => expect(screen.getByRole('img', { name: 'Ronald' })).toHaveAttribute('src', photo.url));
    expect(screen.queryByLabelText(/upload/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove photo/i })).not.toBeInTheDocument();
  });

  it('lets an Admin upload a driver photo and reloads it', async () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);
    render(<DriverPhotoPanel driver="Ronald" />);
    const file = new File(['img'], 'ronald.jpg', { type: 'image/jpeg' });

    expect(screen.getByText('Upload photo')).toBeInTheDocument();
    await userEvent.upload(await screen.findByLabelText('Upload driver photo'), file);

    expect(driverPhotosApi.uploadDriverPhoto).toHaveBeenCalledWith('Ronald', file);
    await waitFor(() => expect(driverPhotosApi.fetchDriverPhoto).toHaveBeenCalledTimes(2));
  });

  it('lets an Admin replace or remove an existing photo', async () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);
    vi.spyOn(driverPhotosApi, 'fetchDriverPhoto').mockResolvedValue(photo);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<DriverPhotoPanel driver="Ronald" />);

    expect(await screen.findByLabelText('Upload new driver photo')).toBeInTheDocument();
    expect(screen.getByText('Change photo')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove photo' }));

    expect(window.confirm).toHaveBeenCalledWith("Remove Ronald's photo?");
    expect(driverPhotosApi.removeDriverPhoto).toHaveBeenCalledWith(photo);
  });

  it('shows why an upload failed', async () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);
    vi.spyOn(driverPhotosApi, 'uploadDriverPhoto').mockRejectedValue(new Error('big.jpg is larger than 10 MB.'));
    render(<DriverPhotoPanel driver="Ronald" />);

    await userEvent.upload(
      await screen.findByLabelText('Upload driver photo'),
      new File(['x'], 'big.jpg', { type: 'image/jpeg' })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('big.jpg is larger than 10 MB.');
  });

  it('offers no upload when the vehicle has no driver', () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);
    render(<DriverPhotoPanel driver={null} />);
    expect(screen.getByText('Not Assigned')).toBeInTheDocument();
    expect(screen.queryByLabelText(/upload/i)).not.toBeInTheDocument();
    expect(driverPhotosApi.fetchDriverPhoto).not.toHaveBeenCalled();
  });
});
