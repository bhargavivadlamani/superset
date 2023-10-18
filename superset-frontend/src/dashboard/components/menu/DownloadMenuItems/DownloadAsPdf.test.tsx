import { SyntheticEvent } from 'react';
import { render, screen, waitFor } from 'spec/helpers/testing-library';
import DownloadAsPdf from './DownloadAsPdf';
import userEvent from '@testing-library/user-event';
// import 'jest-canvas-mock';
import downloadAsPdf from 'src/utils/downloadAsPdf';
import { Menu } from 'src/components/Menu';

jest.mock('src/utils/downloadAsPdf', () => {
  return {
    __esModule: true,
    default: jest.fn(() => (_e: SyntheticEvent) => {}),
  };
});

const createProps = () => {
  return {
    addDangerToast: jest.fn(),
    text: 'Export as PDF',
    dashboardTitle: 'Test Dashboard',
    logEvent: jest.fn(),
  };
};

const renderComponent = () => {
  render(
    <Menu>
      <DownloadAsPdf {...createProps()} />
    </Menu>,
  );
};

test('Should call download pdf on click', async () => {
  const props = createProps();
  renderComponent();
  await waitFor(() => {
    expect(downloadAsPdf).toBeCalledTimes(0);
    expect(props.addDangerToast).toBeCalledTimes(0);
  });

  userEvent.click(screen.getByRole('button', { name: 'Export as PDF' }));

  await waitFor(() => {
    expect(downloadAsPdf).toBeCalledTimes(1);
    expect(props.addDangerToast).toBeCalledTimes(0);
  });
});

// test('Should call addDangerToast once on failure to download pdf', async () => {
//   const props = createProps();
//   renderComponent();

//   userEvent.click(screen.getByRole('button', { name: 'Export as PDF' }));

//   await waitFor(() => {
//     expect(props.addDangerToast).toBeCalledTimes(0);
//   });

//   await waitFor(async () => {
//     expect(props.addDangerToast).toBeCalledTimes(1);
//     expect(props.addDangerToast).toBeCalledWith(
//       'Sorry, something went wrong. Try again later.',
//     );
//   });
// });
