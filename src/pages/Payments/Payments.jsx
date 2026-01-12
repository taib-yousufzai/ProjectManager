import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PaymentList from '../../components/features/PaymentList';
import PaymentForm from '../../components/features/PaymentForm/PaymentForm';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { usePayments } from '../../hooks/usePayments';

const Payments = () => {
  const navigate = useNavigate();
  const { createPayment } = usePayments();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleCreatePayment = async (paymentData) => {
    const result = await createPayment(paymentData);
    if (result.success) {
      setIsAddModalOpen(false);
    }
  };

  return (
    <>
      <div style={{ padding: '1.5rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.875rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              Payments
            </h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              Track and manage all payment transactions across your projects
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Payment
          </Button>
        </div>

        <PaymentList />
      </div>

      {/* Add Payment Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Payment"
        size="large"
      >
        <PaymentForm onSubmit={handleCreatePayment} />
      </Modal>
    </>
  );
};

export default Payments;