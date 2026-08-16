import { useSelector } from 'react-redux';
import ProductPage from './components/ProductPage';
import CheckoutModal from './components/CheckoutModal';
import SummaryBackdrop from './components/SummaryBackdrop';
import FinalStatus from './components/FinalStatus';
import ThemeToggle from './components/ThemeToggle';

export default function App() {
  const step = useSelector((s) => s.checkout.step);

  // El resultado reemplaza la vista: antes se apilaba debajo del catálogo y se
  // veían las dos pantallas a la vez. El modal y el resumen sí van encima del
  // catálogo, porque son capas sobre él y no pantallas distintas.
  if (step === 'result') {
    return (
      <div className="app">
        <ThemeToggle />
        <FinalStatus />
      </div>
    );
  }

  return (
    <div className="app">
      <ThemeToggle />
      <ProductPage />
      {step === 'checkout' && <CheckoutModal />}
      {step === 'summary' && <SummaryBackdrop />}
    </div>
  );
}
