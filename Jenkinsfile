pipeline {
  agent any

  environment {
    NODE_ENV = 'test'
    DOCKER_IMAGE = 'thibaultlefay/tasklist-backend:latest'
    SONAR_HOST_URL = 'http://localhost:9000'
    NODE_VERSION = 'v20.11.0'
    NODE_BIN = '/tmp/node-v20.11.0-linux-x64/bin'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Setup Node.js') {
      steps {
        sh '''
          # Always download fresh Node.js to /tmp
          echo "Installing Node.js v20.11.0..."
          cd /tmp
          rm -rf node-v20.11.0-linux-x64 2>/dev/null || true
          curl -fsSL https://nodejs.org/dist/v20.11.0/node-v20.11.0-linux-x64.tar.xz | tar -xJ
          
          # Verify installation
          /tmp/node-v20.11.0-linux-x64/bin/node --version
          /tmp/node-v20.11.0-linux-x64/bin/npm --version
        '''
      }
    }

    stage('Install dependencies') {
      steps {
        sh '/tmp/node-v20.11.0-linux-x64/bin/npm ci'
      }
    }

    stage('Run unit tests') {
      steps {
        sh '/tmp/node-v20.11.0-linux-x64/bin/npm run test:coverage'
      }
    }

    stage('Run E2E tests') {
      steps {
        sh '/tmp/node-v20.11.0-linux-x64/bin/npm run test:e2e:coverage || true'
      }
    }

    stage('Build backend') {
      steps {
        sh '/tmp/node-v20.11.0-linux-x64/bin/npm run build'
      }
    }

    stage('Quality analysis with SonarQube') {
      steps {
        script {
          withCredentials([string(credentialsId: 'sonar-backend-token', variable: 'SONAR_TOKEN')]) {
            sh '''
              /tmp/node-v20.11.0-linux-x64/bin/npx sonar-scanner \
                -Dsonar.projectKey=cicd-tasklist-backend \
                -Dsonar.projectName=cicd-tasklist-backend \
                -Dsonar.sources=src \
                -Dsonar.tests=src/__tests__ \
                -Dsonar.language=ts \
                -Dsonar.sourceEncoding=UTF-8 \
                -Dsonar.host.url=http://localhost:9000 \
                -Dsonar.login=${SONAR_TOKEN} \
                -Dsonar.exclusions=src/__tests__/**,**/node_modules/**,**/dist/**,**/coverage/** \
                -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info || true
            '''
          }
        }
      }
    }

    stage('Security scan with Trivy') {
      steps {
        sh '''
          if ! command -v trivy &> /dev/null; then
            docker run --rm -v $(pwd):/root aquasec/trivy fs /root --exit-code 0 --format table || true
          else
            trivy fs --exit-code 0 --format table . || true
          fi
        '''
      }
    }

    stage('Build Docker image') {
      steps {
        sh 'docker build -t $DOCKER_IMAGE .'
      }
    }

    stage('Security scan Docker image with Trivy') {
      steps {
        sh '''
          if ! command -v trivy &> /dev/null; then
            docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image --exit-code 0 --format table $DOCKER_IMAGE || true
          else
            trivy image --exit-code 0 --format table $DOCKER_IMAGE || true
          fi
        '''
      }
    }

    stage('Publish Docker image') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          sh '''
            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
            docker push $DOCKER_IMAGE
            docker logout
          '''
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'reports/junit.xml,coverage/**', allowEmptyArchive: true
      junit testResults: 'reports/junit.xml', allowEmptyResults: true
    }
    success {
      echo ' Backend Pipeline completed successfully!'
    }
    failure {
      echo ' Backend Pipeline failed!'
    }
  }
}
