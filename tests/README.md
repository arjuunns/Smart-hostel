# Smart Hostel Selenium Tests

Automated UI tests for the Smart Hostel Leave & Attendance Management System.

## Prerequisites

1. **Java JDK 11+** installed
2. **Maven** installed
3. **Chrome Browser** installed
4. **Backend Server** running on `http://localhost:5000`
5. **Frontend** served on `http://localhost:5500` (use VS Code Live Server)
6. **MongoDB** running

## Project Structure

```
tests/
├── pom.xml                           # Maven configuration
├── README.md                         # This file
└── src/test/java/com/smarthostel/tests/
    ├── SmartHostelAuthTest.java      # Registration & Login tests
    └── SmartHostelLeaveFlowTest.java # Complete leave flow E2E tests
```

## Test Cases

### SmartHostelAuthTest.java
- ✅ Student registration with valid data
- ✅ Warden registration
- ✅ Guard registration
- ✅ Login with valid credentials
- ✅ Login with invalid credentials
- ✅ Duplicate email registration error

### SmartHostelLeaveFlowTest.java
- ✅ Complete E2E flow:
  1. Register student, warden, guard
  2. Student applies for leave
  3. Warden approves leave
  4. Student views QR code

## Running Tests

### Using Maven (Recommended)

```bash
# Navigate to tests folder
cd tests

# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=SmartHostelAuthTest

# Run specific test method
mvn test -Dtest=SmartHostelAuthTest#testStudentRegistration
```

### Running from IDE

1. Import the project as a Maven project
2. Right-click on test class → Run as TestNG/JUnit Test

### Running Standalone (Main Method)

```bash
# Compile
mvn compile test-compile

# Run Auth tests
mvn exec:java -Dexec.mainClass="com.smarthostel.tests.SmartHostelAuthTest" -Dexec.classpathScope=test

# Run Leave Flow tests
mvn exec:java -Dexec.mainClass="com.smarthostel.tests.SmartHostelLeaveFlowTest" -Dexec.classpathScope=test
```

## Configuration

### Changing URLs

Edit the constants in the test files:

```java
private static final String BASE_URL = "http://localhost:5500/frontend/index.html";
private static final String STUDENT_DASHBOARD = "http://localhost:5500/frontend/student.html";
```

### Headless Mode

Uncomment this line in test setup for headless execution:

```java
options.addArguments("--headless");
```

## Troubleshooting

### ChromeDriver Issues
The WebDriverManager automatically downloads the correct ChromeDriver. If issues persist:
```bash
mvn dependency:purge-local-repository -DmanualInclude=io.github.bonigarcia:webdrivermanager
```

### Connection Refused
Ensure both backend and frontend servers are running:
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend (use Live Server in VS Code)
# Or use: npx serve frontend -p 5500
```

### Test Failures
1. Increase wait timeouts if tests are timing out
2. Check browser console for JavaScript errors
3. Verify MongoDB is running and connected
