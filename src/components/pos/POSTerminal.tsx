import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const POSTerminal: React.FC = () => {
  // Sample products
  const products: Product[] = [
    { id: '1', name: 'Bitcoin Payment', price: 100.00, image: '/bitcoin.svg' },
    { id: '2', name: 'Ethereum Payment', price: 75.50, image: '/ethereum.svg' },
    { id: '3', name: 'Litecoin Payment', price: 50.25, image: '/litecoin.svg' },
    { id: '4', name: 'Ripple Payment', price: 25.75, image: '/ripple.svg' },
    { id: '5', name: 'Cardano Payment', price: 15.99, image: '/cardano.svg' },
    { id: '6', name: 'Solana Payment', price: 45.50, image: '/solana.svg' },
    { id: '7', name: 'Polkadot Payment', price: 30.25, image: '/polkadot.svg' },
    { id: '8', name: 'Dogecoin Payment', price: 10.00, image: '/dogecoin.svg' },
  ];

  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'crypto' | 'cash'>('credit');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState('');

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    const existingItem = cart.find(item => item.product.id === productId);
    if (existingItem && existingItem.quantity > 1) {
      setCart(cart.map(item => 
        item.product.id === productId 
          ? { ...item, quantity: item.quantity - 1 } 
          : item
      ));
    } else {
      setCart(cart.filter(item => item.product.id !== productId));
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const processPayment = () => {
    setIsProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      setIsComplete(true);
      // Generate random receipt number
      setReceiptNumber(`OK-${Math.floor(Math.random() * 1000000)}`);
    }, 2000);
  };

  const startNewTransaction = () => {
    setCart([]);
    setIsComplete(false);
    setReceiptNumber('');
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">POS Terminal</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map(product => (
                  <div 
                    key={product.id} 
                    className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => addToCart(product)}
                  >
                    <div className="flex justify-center mb-2">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-8 h-8" />
                        ) : (
                          <span className="text-xl">$</span>
                        )}
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="text-sm text-gray-600">${product.price.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Current Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              {isComplete ? (
                <div className="text-center py-6">
                  <div className="text-green-500 text-5xl mb-4">✓</div>
                  <h3 className="text-xl font-bold mb-2">Payment Complete</h3>
                  <p className="text-gray-600 mb-4">Receipt #{receiptNumber}</p>
                  <p className="text-gray-600 mb-6">Total: ${calculateTotal().toFixed(2)}</p>
                  <Button onClick={startNewTransaction}>New Transaction</Button>
                </div>
              ) : (
                <>
                  {cart.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                      <p>No items in cart</p>
                      <p className="text-sm">Click on products to add them</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                        {cart.map(item => (
                          <div key={item.product.id} className="flex justify-between items-center border-b pb-2">
                            <div>
                              <p className="font-medium">{item.product.name}</p>
                              <p className="text-sm text-gray-600">${item.product.price.toFixed(2)} x {item.quantity}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button 
                                className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"
                                onClick={() => removeFromCart(item.product.id)}
                              >
                                -
                              </button>
                              <span>{item.quantity}</span>
                              <button 
                                className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"
                                onClick={() => addToCart(item.product)}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="border-t pt-3 mb-4">
                        <div className="flex justify-between font-bold">
                          <span>Total:</span>
                          <span>${calculateTotal().toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium mb-2">Payment Method</p>
                          <div className="grid grid-cols-3 gap-2">
                            <button 
                              className={`p-2 border rounded-md text-center ${paymentMethod === 'credit' ? 'bg-indigo-100 border-indigo-500' : ''}`}
                              onClick={() => setPaymentMethod('credit')}
                            >
                              Credit Card
                            </button>
                            <button 
                              className={`p-2 border rounded-md text-center ${paymentMethod === 'crypto' ? 'bg-indigo-100 border-indigo-500' : ''}`}
                              onClick={() => setPaymentMethod('crypto')}
                            >
                              Crypto
                            </button>
                            <button 
                              className={`p-2 border rounded-md text-center ${paymentMethod === 'cash' ? 'bg-indigo-100 border-indigo-500' : ''}`}
                              onClick={() => setPaymentMethod('cash')}
                            >
                              Cash
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            variant="outline" 
                            onClick={clearCart}
                          >
                            Clear
                          </Button>
                          <Button 
                            onClick={processPayment}
                            disabled={isProcessing}
                          >
                            {isProcessing ? 'Processing...' : 'Pay Now'}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default POSTerminal;
