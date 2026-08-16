import { render, screen, fireEvent, act } from '@testing-library/react';
import FeaturedCarousel from './FeaturedCarousel';

const products = [
  { id: 'a', name: 'Monitor Curvo', description: 'QHD', price: 98000000, imageUrl: '/m.jpg' },
  { id: 'b', name: 'Silla Mesh', description: 'Lumbar', price: 13500000, imageUrl: '/s.jpg' },
  { id: 'c', name: 'Auriculares', description: 'ANC', price: 25000000, imageUrl: '/h.jpg' },
];

const dots = () => screen.getAllByRole('tab');
const activeDot = () => dots().findIndex((d) => d.getAttribute('aria-selected') === 'true');

beforeEach(() => {
  // jsdom no implementa scrollTo ni matchMedia.
  Element.prototype.scrollTo = jest.fn();
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
});

describe('FeaturedCarousel', () => {
  it('renders one slide per product with its price', () => {
    render(<FeaturedCarousel products={products} onBuy={() => {}} />);

    expect(document.querySelectorAll('.carousel__slide')).toHaveLength(3);
    expect(screen.getByText('$ 980.000')).toBeInTheDocument();
    expect(dots()).toHaveLength(3);
    expect(activeDot()).toBe(0);
  });

  it('renders nothing when there is nothing to feature', () => {
    const { container } = render(<FeaturedCarousel products={[]} onBuy={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('moves forward and wraps around at the end', () => {
    render(<FeaturedCarousel products={products} onBuy={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(activeDot()).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(activeDot()).toBe(0);
  });

  it('goes backwards from the first slide to the last', () => {
    render(<FeaturedCarousel products={products} onBuy={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));

    expect(activeDot()).toBe(2);
  });

  it('jumps straight to the slide picked on the dots', () => {
    render(<FeaturedCarousel products={products} onBuy={() => {}} />);

    fireEvent.click(dots()[2]);

    expect(activeDot()).toBe(2);
  });

  it('walks with the arrow keys', () => {
    render(<FeaturedCarousel products={products} onBuy={() => {}} />);

    fireEvent.keyDown(document.querySelector('.carousel'), { key: 'ArrowRight' });
    expect(activeDot()).toBe(1);

    fireEvent.keyDown(document.querySelector('.carousel'), { key: 'ArrowLeft' });
    expect(activeDot()).toBe(0);
  });

  it('hands the product over when buying from the slide', () => {
    const onBuy = jest.fn();
    render(<FeaturedCarousel products={products} onBuy={onBuy} />);

    fireEvent.click(screen.getAllByRole('button', { name: /comprar/i })[0]);

    expect(onBuy).toHaveBeenCalledWith(products[0]);
  });

  it('advances on its own and stops while the pointer is over it', () => {
    jest.useFakeTimers();
    render(<FeaturedCarousel products={products} onBuy={() => {}} />);

    act(() => jest.advanceTimersByTime(6000));
    expect(activeDot()).toBe(1);

    fireEvent.mouseEnter(document.querySelector('.carousel'));
    act(() => jest.advanceTimersByTime(12000));
    expect(activeDot()).toBe(1);

    jest.useRealTimers();
  });

  it('stays put when the system asks for less motion', () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    jest.useFakeTimers();
    render(<FeaturedCarousel products={products} onBuy={() => {}} />);

    act(() => jest.advanceTimersByTime(30000));

    expect(activeDot()).toBe(0);
    jest.useRealTimers();
  });
});
