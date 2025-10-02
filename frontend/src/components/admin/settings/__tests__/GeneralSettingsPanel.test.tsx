import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GeneralSettingsPanel from '../GeneralSettingsPanel';
import { GeneralSettings } from '../../../../types/admin';

// Mock the ConfirmationDialog component
jest.mock('../../ConfirmationDialog', () => {
  return function MockConfirmationDialog({ isOpen, onConfirm, onClose, children, title }: any) {
    if (!isOpen) return null;
    return (
      <div data-testid="confirmation-dialog">
        <h3>{title}</h3>
        {children}
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    );
  };
});

const mockSettings: GeneralSettings = {
  siteName: 'HarborList',
  siteDescription: 'The premier marketplace for buying and selling boats',
  supportEmail: 'support@harborlist.com',
  maintenanceMode: false,
  registrationEnabled: true,
  maxListingsPerUser: 10,
  sessionTimeout: 60
};

describe('GeneralSettingsPanel', () => {
  const mockOnUpdate = jest.fn();
  const mockOnValidate = jest.fn();
  const mockOnReset = jest.fn();
  const mockOnChange = jest.fn();
  const mockOnSave = jest.fn();

  const defaultProps = {
    settings: mockSettings,
    onUpdate: mockOnUpdate,
    onValidate: mockOnValidate,
    onReset: mockOnReset,
    onChange: mockOnChange,
    onSave: mockOnSave
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all form fields with correct values', () => {
    render(<GeneralSettingsPanel {...defaultProps} />);

    expect(screen.getByDisplayValue('HarborList')).toBeInTheDocument();
    expect(screen.getByDisplayValue('The premier marketplace for buying and selling boats')).toBeInTheDocument();
    expect(screen.getByDisplayValue('support@harborlist.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    expect(screen.getByDisplayValue('60')).toBeInTheDocument();

    // Check checkboxes
    expect(screen.getByLabelText('Maintenance Mode')).not.toBeChecked();
    expect(screen.getByLabelText('User Registration Enabled')).toBeChecked();
  });

  it('should call onChange when form fields are modified', async () => {
    render(<GeneralSettingsPanel {...defaultProps} />);

    const siteNameInput = screen.getByDisplayValue('HarborList');
    fireEvent.change(siteNameInput, { target: { value: 'New Site Name' } });

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should validate required fields', async () => {
    render(<GeneralSettingsPanel {...defaultProps} />);

    // Clear site name
    const siteNameInput = screen.getByDisplayValue('HarborList');
    fireEvent.change(siteNameInput, { target: { value: '' } });

    // Try to save
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Site name is required')).toBeInTheDocument();
    });

    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  it('should validate email format', async () => {
    render(<GeneralSettingsPanel {...defaultProps} />);

    // Enter invalid email
    const emailInput = screen.getByDisplayValue('support@harborlist.com');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    // Try to save
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });

    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  it('should validate numeric fields', async () => {
    render(<GeneralSettingsPanel {...defaultProps} />);

    // Set max listings to 0
    const maxListingsInput = screen.getByDisplayValue('10');
    fireEvent.change(maxListingsInput, { target: { value: '0' } });

    // Try to save
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Must be at least 1')).toBeInTheDocument();
    });

    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  it('should show save confirmation dialog', async () => {
    render(<GeneralSettingsPanel {...defaultProps} />);

    // Make a change
    const siteNameInput = screen.getByDisplayValue('HarborList');
    fireEvent.change(siteNameInput, { target: { value: 'New Site Name' } });

    // Click save
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByTestId('confirmation-dialog')).toBeInTheDocument();
      expect(screen.getByText('Save General Settings')).toBeInTheDocument();
    });
  });

  it('should require reason for save', async () => {
    // Mock alert
    const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<GeneralSettingsPanel {...defaultProps} />);

    // Make a change
    const siteNameInput = screen.getByDisplayValue('HarborList');
    fireEvent.change(siteNameInput, { target: { value: 'New Site Name' } });

    // Click save
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByTestId('confirmation-dialog')).toBeInTheDocument();
    });

    // Try to confirm without reason
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    expect(mockAlert).toHaveBeenCalledWith('Please provide a reason for this change');
    expect(mockOnUpdate).not.toHaveBeenCalled();

    mockAlert.mockRestore();
  });

  it('should save settings with reason', async () => {
    mockOnUpdate.mockResolvedValue(undefined);

    render(<GeneralSettingsPanel {...defaultProps} />);

    // Make a change
    const siteNameInput = screen.getByDisplayValue('HarborList');
    fireEvent.change(siteNameInput, { target: { value: 'New Site Name' } });

    // Click save
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByTestId('confirmation-dialog')).toBeInTheDocument();
    });

    // Enter reason
    const reasonTextarea = screen.getByPlaceholderText('Describe why you\'re making these changes...');
    fireEvent.change(reasonTextarea, { target: { value: 'Updating site branding' } });

    // Confirm save
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        section: 'general',
        data: expect.objectContaining({
          siteName: 'New Site Name'
        }),
        reason: 'Updating site branding'
      });
    });

    expect(mockOnSave).toHaveBeenCalled();
  });

  it('should show reset confirmation dialog', async () => {
    render(<GeneralSettingsPanel {...defaultProps} />);

    const resetButton = screen.getByText('Reset to Defaults');
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(screen.getByTestId('confirmation-dialog')).toBeInTheDocument();
      expect(screen.getByText('Reset General Settings')).toBeInTheDocument();
    });
  });

  it('should reset settings with reason', async () => {
    mockOnReset.mockResolvedValue(undefined);

    render(<GeneralSettingsPanel {...defaultProps} />);

    const resetButton = screen.getByText('Reset to Defaults');
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(screen.getByTestId('confirmation-dialog')).toBeInTheDocument();
    });

    // Enter reason
    const reasonTextarea = screen.getByPlaceholderText('Describe why you\'re resetting these settings...');
    fireEvent.change(reasonTextarea, { target: { value: 'Reverting to defaults' } });

    // Confirm reset
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnReset).toHaveBeenCalledWith('general', 'Reverting to defaults');
    });

    expect(mockOnSave).toHaveBeenCalled();
  });

  it('should cancel changes', async () => {
    render(<GeneralSettingsPanel {...defaultProps} />);

    // Make a change
    const siteNameInput = screen.getByDisplayValue('HarborList');
    fireEvent.change(siteNameInput, { target: { value: 'New Site Name' } });

    // Click cancel
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Should revert to original value
    await waitFor(() => {
      expect(screen.getByDisplayValue('HarborList')).toBeInTheDocument();
    });
  });

  it('should disable save and cancel buttons when no changes', () => {
    render(<GeneralSettingsPanel {...defaultProps} />);

    const saveButton = screen.getByText('Save Changes');
    const cancelButton = screen.getByText('Cancel');

    expect(saveButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('should enable save and cancel buttons when changes are made', async () => {
    render(<GeneralSettingsPanel {...defaultProps} />);

    // Make a change
    const siteNameInput = screen.getByDisplayValue('HarborList');
    fireEvent.change(siteNameInput, { target: { value: 'New Site Name' } });

    await waitFor(() => {
      const saveButton = screen.getByText('Save Changes');
      const cancelButton = screen.getByText('Cancel');

      expect(saveButton).not.toBeDisabled();
      expect(cancelButton).not.toBeDisabled();
    });
  });

  it('should handle checkbox changes', async () => {
    render(<GeneralSettingsPanel {...defaultProps} />);

    const maintenanceModeCheckbox = screen.getByLabelText('Maintenance Mode');
    fireEvent.click(maintenanceModeCheckbox);

    expect(mockOnChange).toHaveBeenCalled();
    expect(maintenanceModeCheckbox).toBeChecked();
  });

  it('should handle save error', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockOnUpdate.mockRejectedValue(new Error('Save failed'));

    render(<GeneralSettingsPanel {...defaultProps} />);

    // Make a change
    const siteNameInput = screen.getByDisplayValue('HarborList');
    fireEvent.change(siteNameInput, { target: { value: 'New Site Name' } });

    // Click save
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByTestId('confirmation-dialog')).toBeInTheDocument();
    });

    // Enter reason and confirm
    const reasonTextarea = screen.getByPlaceholderText('Describe why you\'re making these changes...');
    fireEvent.change(reasonTextarea, { target: { value: 'Test reason' } });

    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Failed to save settings:', expect.any(Error));
    });

    consoleError.mockRestore();
  });
});