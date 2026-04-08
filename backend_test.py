#!/usr/bin/env python3
"""
MomCareAI Backend API Testing Suite
Tests all backend endpoints for functionality and integration
"""

import requests
import json
import sys
import time
from datetime import datetime

class MomCareAPITester:
    def __init__(self, base_url="https://caring-health-ai.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.session_id = "test_session"
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def run_test(self, name, method, endpoint, expected_status=200, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}
            
        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                self.log(f"❌ Unsupported method: {method}", "ERROR")
                return False, {}
                
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {"raw_response": response.text}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}", "ERROR")
                self.log(f"Response: {response.text[:200]}", "ERROR")
                return False, {}
                
        except requests.exceptions.Timeout:
            self.log(f"❌ {name} - Request timeout", "ERROR")
            return False, {}
        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}", "ERROR")
            return False, {}
    
    def test_health_check(self):
        """Test basic health endpoint"""
        return self.run_test("Health Check", "GET", "health")
    
    def test_chat_basic(self):
        """Test basic chat functionality"""
        test_message = "I have a headache and slept 4 hours"
        data = {"message": test_message, "session_id": self.session_id}
        success, response = self.run_test("Basic Chat", "POST", "chat", 200, data)
        
        if success:
            # Validate response structure
            required_fields = ["reply", "extracted_data"]
            for field in required_fields:
                if field not in response:
                    self.log(f"❌ Chat response missing field: {field}", "ERROR")
                    return False
            
            # Check extracted data structure
            extracted = response.get("extracted_data", {})
            if "symptoms" not in extracted or "sleep_hours" not in extracted:
                self.log(f"❌ Chat extracted_data missing required fields", "ERROR")
                return False
                
            self.log(f"✅ Chat extracted symptoms: {extracted.get('symptoms', [])}")
            self.log(f"✅ Chat extracted sleep: {extracted.get('sleep_hours')}")
            
        return success
    
    def test_high_risk_detection(self):
        """Test high-risk symptom detection"""
        test_message = "I have chest pain and breathlessness"
        data = {"message": test_message, "session_id": self.session_id}
        success, response = self.run_test("High Risk Detection", "POST", "chat", 200, data)
        
        if success:
            if "high_risk_warning" not in response:
                self.log(f"❌ High risk warning not present in response", "ERROR")
                return False
            elif response["high_risk_warning"] is None:
                self.log(f"❌ High risk warning is null for dangerous symptoms", "ERROR")
                return False
            else:
                self.log(f"✅ High risk warning detected: {response['high_risk_warning'][:100]}...")
                
        return success
    
    def test_chat_history(self):
        """Test chat history retrieval"""
        success, response = self.run_test("Chat History", "GET", f"chat/history?session_id={self.session_id}")
        
        if success:
            if "messages" not in response:
                self.log(f"❌ Chat history missing 'messages' field", "ERROR")
                return False
            
            messages = response["messages"]
            if not isinstance(messages, list):
                self.log(f"❌ Chat history messages is not a list", "ERROR")
                return False
                
            self.log(f"✅ Chat history contains {len(messages)} messages")
            
        return success
    
    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test("Dashboard Stats", "GET", f"dashboard/stats?session_id={self.session_id}")
        
        if success:
            required_fields = ["total_entries", "total_messages", "unique_symptoms_7d", "entries_7d"]
            for field in required_fields:
                if field not in response:
                    self.log(f"❌ Dashboard stats missing field: {field}", "ERROR")
                    return False
            
            self.log(f"✅ Dashboard stats - Entries: {response.get('total_entries')}, Messages: {response.get('total_messages')}")
            
        return success
    
    def test_patterns(self):
        """Test health patterns analysis"""
        success, response = self.run_test("Health Patterns", "GET", f"patterns?session_id={self.session_id}")
        
        if success:
            required_fields = ["insights", "symptom_frequency", "mood_frequency"]
            for field in required_fields:
                if field not in response:
                    self.log(f"❌ Patterns response missing field: {field}", "ERROR")
                    return False
            
            insights = response.get("insights", [])
            self.log(f"✅ Patterns analysis - {len(insights)} insights generated")
            
        return success
    
    def test_doctor_report(self):
        """Test doctor report generation"""
        success, response = self.run_test("Doctor Report", "GET", f"report?session_id={self.session_id}")
        
        if success:
            if "report" not in response:
                self.log(f"❌ Report response missing 'report' field", "ERROR")
                return False
            
            report = response["report"]
            required_fields = ["generated_at", "period", "summary"]
            for field in required_fields:
                if field not in report:
                    self.log(f"❌ Report missing field: {field}", "ERROR")
                    return False
            
            self.log(f"✅ Doctor report generated for {report.get('period')}")
            
        return success
    
    def test_prescription_analyzer(self):
        """Test prescription analysis"""
        test_prescription = "Tab Paracetamol 500mg twice daily for 5 days"
        data = {"text": test_prescription}
        success, response = self.run_test("Prescription Analyzer", "POST", "prescription/analyze", 200, data)
        
        if success:
            required_fields = ["medicines", "explanation", "reminders"]
            for field in required_fields:
                if field not in response:
                    self.log(f"❌ Prescription response missing field: {field}", "ERROR")
                    return False
            
            medicines = response.get("medicines", [])
            reminders = response.get("reminders", [])
            self.log(f"✅ Prescription analysis - {len(medicines)} medicines, {len(reminders)} reminders")
            
        return success
    
    def test_clear_chat(self):
        """Test chat history clearing"""
        success, response = self.run_test("Clear Chat History", "DELETE", f"chat/history?session_id={self.session_id}")
        
        if success:
            # Verify chat was cleared by checking history
            time.sleep(1)  # Brief delay
            verify_success, verify_response = self.run_test("Verify Chat Cleared", "GET", f"chat/history?session_id={self.session_id}")
            
            if verify_success:
                messages = verify_response.get("messages", [])
                if len(messages) == 0:
                    self.log(f"✅ Chat history successfully cleared")
                else:
                    self.log(f"❌ Chat history not cleared - still has {len(messages)} messages", "ERROR")
                    return False
            
        return success
    
    def run_all_tests(self):
        """Run all API tests in sequence"""
        self.log("Starting MomCareAI Backend API Tests")
        self.log(f"Testing against: {self.base_url}")
        
        # Test sequence - order matters for some tests
        test_methods = [
            self.test_health_check,
            self.test_chat_basic,
            self.test_high_risk_detection,
            self.test_chat_history,
            self.test_dashboard_stats,
            self.test_patterns,
            self.test_doctor_report,
            self.test_prescription_analyzer,
            self.test_clear_chat,
        ]
        
        for test_method in test_methods:
            try:
                test_method()
                time.sleep(0.5)  # Brief delay between tests
            except Exception as e:
                self.log(f"❌ Test {test_method.__name__} failed with exception: {str(e)}", "ERROR")
        
        # Print summary
        self.log("=" * 50)
        self.log(f"Tests completed: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"Success rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            self.log("🎉 All tests passed!")
            return 0
        else:
            self.log(f"❌ {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    """Main test runner"""
    tester = MomCareAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())