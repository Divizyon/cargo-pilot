import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErpProviderMark } from '@/components/shared/ErpProviderMark';

describe('ErpProviderMark', () => {
  it('Logo kayitlarini saglayici ikonuyla gosterir', () => {
    render(<ErpProviderMark systemName="Logo Tiger" />);

    expect(screen.getByRole('img', { name: 'Logo' })).toBeInTheDocument();
  });

  it('ikonu olmayan Netsis kayitlarini metin rozetiyle gosterir', () => {
    render(<ErpProviderMark systemName="Netsis ERP" />);

    expect(screen.getByText('Netsis')).toBeInTheDocument();
  });

  it('taninmayan saglayicida ham adi rozet olarak gosterir', () => {
    render(<ErpProviderMark systemName="SAP" />);

    expect(screen.getByText('SAP')).toBeInTheDocument();
  });

  it('saglayici yoksa hicbir isaret basmaz', () => {
    const { container } = render(<ErpProviderMark systemName={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});
