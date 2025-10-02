import { useState } from 'react';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">
              Contact Us
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Have a question or need assistance? We're here to help. Reach out to our team 
              and we'll get back to you as soon as possible.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">📞</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Phone Support</h3>
              <p className="text-slate-600 mb-6">
                Speak directly with our support team for immediate assistance.
              </p>
              <div className="space-y-2">
                <div className="font-semibold text-blue-600 text-xl">1-800-MARINE-1</div>
                <div className="text-sm text-slate-600">Monday - Friday: 8AM - 8PM EST</div>
                <div className="text-sm text-slate-600">Saturday: 9AM - 5PM EST</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">💬</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Live Chat</h3>
              <p className="text-slate-600 mb-6">
                Get instant answers to your questions with our live chat support.
              </p>
              <div className="space-y-2">
                <div className="font-semibold text-green-600">Available 24/7</div>
                <div className="text-sm text-slate-600">Average response time: 2 minutes</div>
                <button className="btn-primary mt-4">Start Chat</button>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">📧</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Email Support</h3>
              <p className="text-slate-600 mb-6">
                Send us a detailed message and we'll respond within 24 hours.
              </p>
              <div className="space-y-2">
                <div className="font-semibold text-purple-600">support@marinemarket.com</div>
                <div className="text-sm text-slate-600">Response time: Within 24 hours</div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Send Us a Message</h2>
                <p className="text-slate-600">
                  Fill out the form below and we'll get back to you as soon as possible
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Category
                    </label>
                    <select 
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      <option value="">Select a category</option>
                      <option value="general">General Inquiry</option>
                      <option value="technical">Technical Support</option>
                      <option value="billing">Billing & Payments</option>
                      <option value="listing">Listing Issues</option>
                      <option value="account">Account Problems</option>
                      <option value="feedback">Feedback & Suggestions</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Subject *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    rows={6}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Please provide as much detail as possible..."
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                  ></textarea>
                </div>

                <div className="text-center">
                  <button type="submit" className="btn-primary btn-lg">
                    <span className="flex items-center space-x-2">
                      <span>📤</span>
                      <span>Send Message</span>
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Office Locations */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Our Offices
            </h2>
            <p className="text-xl text-slate-600">
              Visit us at one of our locations
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-50 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Miami Headquarters</h3>
              <div className="space-y-3 text-slate-600">
                <div className="flex items-start space-x-3">
                  <span className="text-blue-600 mt-1">📍</span>
                  <div>
                    <div>1234 Ocean Drive</div>
                    <div>Miami Beach, FL 33139</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-blue-600">📞</span>
                  <span>(305) 555-0123</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-blue-600">🕒</span>
                  <span>Mon-Fri: 9AM-6PM EST</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-slate-900 mb-4">San Diego Office</h3>
              <div className="space-y-3 text-slate-600">
                <div className="flex items-start space-x-3">
                  <span className="text-blue-600 mt-1">📍</span>
                  <div>
                    <div>5678 Harbor Boulevard</div>
                    <div>San Diego, CA 92101</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-blue-600">📞</span>
                  <span>(619) 555-0456</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-blue-600">🕒</span>
                  <span>Mon-Fri: 9AM-6PM PST</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Seattle Office</h3>
              <div className="space-y-3 text-slate-600">
                <div className="flex items-start space-x-3">
                  <span className="text-blue-600 mt-1">📍</span>
                  <div>
                    <div>9012 Marina Way</div>
                    <div>Seattle, WA 98101</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-blue-600">📞</span>
                  <span>(206) 555-0789</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-blue-600">🕒</span>
                  <span>Mon-Fri: 9AM-6PM PST</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-slate-600">
              Quick answers to common questions
            </p>
          </div>

          <div className="space-y-4">
            <details className="bg-white rounded-xl shadow-sm border border-slate-200">
              <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 rounded-xl">
                <h4 className="font-semibold text-slate-900">What are your support hours?</h4>
                <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </summary>
              <div className="px-6 pb-6">
                <p className="text-slate-600">
                  Our phone support is available Monday-Friday 8AM-8PM EST and Saturday 9AM-5PM EST. 
                  Live chat is available 24/7, and email support responds within 24 hours.
                </p>
              </div>
            </details>

            <details className="bg-white rounded-xl shadow-sm border border-slate-200">
              <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 rounded-xl">
                <h4 className="font-semibold text-slate-900">How quickly will I get a response?</h4>
                <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </summary>
              <div className="px-6 pb-6">
                <p className="text-slate-600">
                  Live chat responses average 2 minutes, phone calls are answered immediately during business hours, 
                  and email responses are sent within 24 hours (usually much faster).
                </p>
              </div>
            </details>

            <details className="bg-white rounded-xl shadow-sm border border-slate-200">
              <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 rounded-xl">
                <h4 className="font-semibold text-slate-900">Can I schedule a call with support?</h4>
                <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </summary>
              <div className="px-6 pb-6">
                <p className="text-slate-600">
                  Yes! For complex issues or detailed consultations, you can schedule a call with our support team. 
                  Contact us via chat, email, or phone to set up an appointment.
                </p>
              </div>
            </details>
          </div>
        </div>
      </section>
    </div>
  );
}