import { useState } from 'react';

export default function Help() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Topics', icon: '📚' },
    { id: 'buying', name: 'Buying a Boat', icon: '🛒' },
    { id: 'selling', name: 'Selling a Boat', icon: '💰' },
    { id: 'account', name: 'Account & Profile', icon: '👤' },
    { id: 'payments', name: 'Payments & Billing', icon: '💳' },
    { id: 'technical', name: 'Technical Support', icon: '🔧' }
  ];

  const faqs = [
    {
      category: 'buying',
      question: 'How do I search for boats on MarineMarket?',
      answer: 'Use our advanced search filters to find boats by type, price range, location, year, and more. You can also browse by category or use our AI-powered recommendation engine.'
    },
    {
      category: 'buying',
      question: 'How do I contact a boat seller?',
      answer: 'Click the "Contact Seller" button on any listing to send a secure message through our platform. The seller will receive your inquiry and can respond directly.'
    },
    {
      category: 'buying',
      question: 'Can I schedule a boat inspection?',
      answer: 'Yes! We recommend having any boat professionally inspected before purchase. Many sellers allow inspections, and we can connect you with certified marine surveyors.'
    },
    {
      category: 'selling',
      question: 'How much does it cost to list my boat?',
      answer: 'Listing your boat is free! We only charge a 3.5% success fee when your boat sells. No upfront costs, no monthly fees.'
    },
    {
      category: 'selling',
      question: 'How do I create an effective boat listing?',
      answer: 'Include high-quality photos, detailed descriptions, accurate specifications, and competitive pricing. Our listing wizard guides you through the process step-by-step.'
    },
    {
      category: 'selling',
      question: 'How long does it take to sell a boat?',
      answer: 'Average time varies by boat type and market conditions, but most boats sell within 60-90 days. Properly priced boats with good photos typically sell faster.'
    },
    {
      category: 'account',
      question: 'How do I create an account?',
      answer: 'Click "Sign Up" in the top right corner, enter your email and create a password. You can also sign up using your Google or Facebook account for faster registration.'
    },
    {
      category: 'account',
      question: 'How do I reset my password?',
      answer: 'Click "Forgot Password" on the login page, enter your email address, and we\'ll send you a reset link. Follow the instructions in the email to create a new password.'
    },
    {
      category: 'payments',
      question: 'When do I pay the success fee?',
      answer: 'The 3.5% success fee is only charged when your boat sells. We\'ll send you an invoice after the sale is completed and funds have been transferred.'
    },
    {
      category: 'payments',
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards, bank transfers, and PayPal. All payments are processed securely through our encrypted payment system.'
    },
    {
      category: 'technical',
      question: 'Why can\'t I upload photos?',
      answer: 'Ensure your photos are in JPG or PNG format and under 10MB each. Clear your browser cache and try again. If issues persist, contact our technical support team.'
    },
    {
      category: 'technical',
      question: 'The website is running slowly. What should I do?',
      answer: 'Try refreshing the page, clearing your browser cache, or using a different browser. Check your internet connection and disable browser extensions that might interfere.'
    }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">
              Help Center
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Find answers to common questions, get support, and learn how to make the most of MarineMarket
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for help articles..."
                  className="w-full px-6 py-4 pr-12 text-slate-900 rounded-xl border-0 focus:ring-2 focus:ring-white/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-12 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-6">
            <button className="flex items-center space-x-3 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
              <span className="text-2xl">💬</span>
              <div className="text-left">
                <div className="font-semibold text-slate-900">Live Chat</div>
                <div className="text-sm text-slate-600">Get instant help</div>
              </div>
            </button>
            
            <button className="flex items-center space-x-3 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors">
              <span className="text-2xl">📞</span>
              <div className="text-left">
                <div className="font-semibold text-slate-900">Call Support</div>
                <div className="text-sm text-slate-600">1-800-MARINE-1</div>
              </div>
            </button>
            
            <button className="flex items-center space-x-3 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors">
              <span className="text-2xl">📧</span>
              <div className="text-left">
                <div className="font-semibold text-slate-900">Email Us</div>
                <div className="text-sm text-slate-600">Get detailed help</div>
              </div>
            </button>
            
            <button className="flex items-center space-x-3 p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors">
              <span className="text-2xl">📚</span>
              <div className="text-left">
                <div className="font-semibold text-slate-900">User Guide</div>
                <div className="text-sm text-slate-600">Step-by-step tutorials</div>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Categories and FAQs */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Categories Sidebar */}
            <div className="lg:col-span-1">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Browse by Category</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="text-xl">{category.icon}</span>
                    <span className="font-medium">{category.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* FAQs */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-slate-900">
                  {selectedCategory === 'all' ? 'Frequently Asked Questions' : 
                   categories.find(c => c.id === selectedCategory)?.name}
                </h3>
                <span className="text-slate-600">{filteredFaqs.length} articles</span>
              </div>

              <div className="space-y-4">
                {filteredFaqs.map((faq, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200">
                    <details className="group">
                      <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 rounded-xl">
                        <h4 className="font-semibold text-slate-900 pr-4">{faq.question}</h4>
                        <svg className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </summary>
                      <div className="px-6 pb-6">
                        <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
                      </div>
                    </details>
                  </div>
                ))}
              </div>

              {filteredFaqs.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">No results found</h3>
                  <p className="text-slate-600">Try adjusting your search or browse a different category.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Popular Guides */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Popular Guides
            </h2>
            <p className="text-xl text-slate-600">
              Step-by-step tutorials to help you succeed
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-50 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">📝</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">How to Create the Perfect Listing</h3>
              <p className="text-slate-600 mb-6">
                Learn how to write compelling descriptions, take great photos, and price your boat competitively.
              </p>
              <button className="text-blue-600 font-medium hover:text-blue-700">
                Read Guide →
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">🔍</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Boat Buying Checklist</h3>
              <p className="text-slate-600 mb-6">
                Everything you need to know before purchasing a boat, from inspection to financing.
              </p>
              <button className="text-blue-600 font-medium hover:text-blue-700">
                Read Guide →
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">🛡️</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Safe Transaction Tips</h3>
              <p className="text-slate-600 mb-6">
                Protect yourself from scams and ensure secure transactions when buying or selling boats.
              </p>
              <button className="text-blue-600 font-medium hover:text-blue-700">
                Read Guide →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Still Need Help?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Our support team is here to help you succeed on MarineMarket
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/10 rounded-xl p-6">
              <div className="text-3xl mb-4">💬</div>
              <h3 className="font-bold mb-2">Live Chat</h3>
              <p className="text-blue-100 text-sm mb-4">Available 24/7 for instant support</p>
              <button className="btn-secondary">Start Chat</button>
            </div>
            
            <div className="bg-white/10 rounded-xl p-6">
              <div className="text-3xl mb-4">📞</div>
              <h3 className="font-bold mb-2">Phone Support</h3>
              <p className="text-blue-100 text-sm mb-4">Mon-Fri 8AM-8PM EST</p>
              <button className="btn-secondary">Call Now</button>
            </div>
            
            <div className="bg-white/10 rounded-xl p-6">
              <div className="text-3xl mb-4">📧</div>
              <h3 className="font-bold mb-2">Email Support</h3>
              <p className="text-blue-100 text-sm mb-4">Detailed help within 24 hours</p>
              <button className="btn-secondary">Send Email</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}